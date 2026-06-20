from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
import os
import json

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash"   # cheapest for extraction
MODEL_EXPORT = "gemini-2.5-flash" # slightly stronger for content generation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock to your frontend URL before deploying to prod
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────

class ChatInput(BaseModel):
    rawChat: str

    def truncated(self, max_chars: int = 12000) -> str:
        if len(self.rawChat) > max_chars:
            return self.rawChat[:max_chars] + "\n\n[Chat truncated for analysis]"
        return self.rawChat
class ExportInput(BaseModel):
    rawChat: str
    exportType: str

    def truncated(self, max_chars: int = 6000) -> str:
        if len(self.rawChat) > max_chars:
            return self.rawChat[:max_chars] + "\n\n[Chat truncated for analysis]"
        return self.rawChat


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def safe_parse(text: str) -> dict:
    """Parse JSON from Gemini response, handles markdown fences gracefully."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        # parts[1] is the content between first pair of backticks
        cleaned = parts[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned.strip())


RESUME_PROMPT_EXAMPLE = """
Example of a high quality resumePrompt:

\"Context: Building a React todo app with Redux Toolkit for state management.

Completed so far:
- Installed redux and react-redux
- Created store with configureStore
- Wrapped app with Provider component
- Connected components using useSelector and useDispatch

Current state: Store is working, todos can be added and read from Redux state. 
No persistence yet.

Last discussed: Adding redux-persist so todos survive a page refresh.

Next question: How do I wrap my existing reducer with persistReducer and what 
should my store.js look like after integrating persistStore?\"
"""


def build_main_prompt(chat: str) -> str:
    return f"""
You are an expert at analyzing AI conversations and extracting structured information.

{RESUME_PROMPT_EXAMPLE}

Analyze the conversation below and return a JSON object with exactly these fields:

- tokenCount: estimated number of tokens in the conversation (integer)
- healthScore: percentage of a typical 128k context window used (integer 0-100)
- healthStatus: "healthy" if healthScore under 50, "warning" if 50-80, "critical" if over 80 (string)
- summary: 2-3 sentence summary of what was discussed and accomplished (string)
- decisions: list of decisions made during the conversation (array of strings)
- actionItems: list of concrete action items or tasks identified (array of strings)
- openQuestions: list of questions that were raised but not fully resolved (array of strings)
- codeSnippets: list of code snippets mentioned or written, each as a string (array of strings)
- resumePrompt: a structured prompt following the EXACT format shown in the example above.
  It must contain: Context, Completed so far, Current state, Last discussed, Next question.
  Be specific — include actual tech names, variable names, file names from the conversation.

Return only valid JSON. No markdown, no explanation, no extra text.

Conversation:
{chat}
"""


def build_score_prompt(resume_prompt: str) -> str:
    return f"""
You are evaluating the quality of a "resume prompt" — a prompt used to continue 
an AI conversation in a new window without losing context.

A perfect resume prompt (score 10) must have all 5 of these:
1. Context — what is being built or discussed (one clear line)
2. Completed so far — bulleted list of what has been done
3. Current state — what the code/project looks like RIGHT NOW
4. Last discussed — the very last topic or problem raised
5. Next question — one specific, precise question to continue from exactly here

Score the resume prompt below and return a JSON object with:
- score: integer from 1 to 10
- missing: array of strings describing what is missing or weak (empty array if nothing missing)
- improved: if score is under 7, write a better version following all 5 rules above.
  If score is 7 or above, return the original prompt unchanged.

Return only valid JSON. No markdown, no explanation.

Resume prompt to evaluate:
{resume_prompt}
"""


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "ChatForge AI service running"}



@app.post("/analyze")
async def analyze(input: ChatInput):
    if not input.rawChat.strip():
        raise HTTPException(status_code=400, detail="rawChat cannot be empty")

    chat = input.truncated()

    try:
        main_response = client.models.generate_content(
            model=MODEL,
            contents=build_main_prompt(chat)
        )
        result = safe_parse(main_response.text)
        result["openQuestions"] = [q for q in result.get("openQuestions", []) if q.strip()]
        result["decisions"] = [d for d in result.get("decisions", []) if d.strip()]
        result["actionItems"] = [a for a in result.get("actionItems", []) if a.strip()]
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

    # skip scoring step entirely for long chats to stay under timeout
    if len(chat) > 4000:
        result["promptScore"] = None
        result["promptGaps"] = []
        return result

    # only score for shorter chats where we have time budget
    try:
        score_response = client.models.generate_content(
            model=MODEL,
            contents=build_score_prompt(result.get("resumePrompt", ""))
        )
        score_result = safe_parse(score_response.text)
        score = score_result.get("score", 10)
        if score < 7:
            result["resumePrompt"] = score_result.get("improved", result["resumePrompt"])
        result["promptScore"] = score
        result["promptGaps"] = score_result.get("missing", [])
    except Exception:
        result["promptScore"] = None
        result["promptGaps"] = []

    return result
@app.post("/export")
async def export(input: ExportInput):
    """
    Generate content from a chat conversation.
    exportType: BLOG | LINKEDIN | ACTION_ITEMS
    """
    if not input.rawChat.strip():
        raise HTTPException(status_code=400, detail="rawChat cannot be empty")

    prompts = {
        "BLOG": f"""
Write a detailed, engaging blog post based on the key insights from this AI conversation.
Structure it with an intro, main sections, and a conclusion.
Write in first person as if you are the person who had the conversation.

IMPORTANT formatting rules — this will be published as PLAIN TEXT, not rendered markdown:
- Do NOT use markdown syntax: no ##, ###, **, *, backticks, or bullet dashes
- For section headings, just write them as a short standalone line followed by a blank line
  (the platform will display them as plain text, so keep them punchy and clear without symbols)
- For code snippets, write them as plainly indented or clearly introduced text — do NOT wrap
  in triple backticks or use any code-block syntax
- For emphasis, rely on word choice and sentence structure, not asterisks or underscores
- Use plain paragraph breaks (blank lines) to separate sections instead of markdown headers

Return only the blog content as clean plain text, no extra explanation.

Conversation:
{input.truncated()}
""",
        "LINKEDIN": f"""
Write a professional LinkedIn post based on the key insight or learning from this AI conversation.
Requirements:
- Under 300 words
- Hook in the first line (no "I" as the first word)
- 3-5 short punchy paragraphs
- 3-5 relevant hashtags at the end
- Conversational but professional tone
- Plain text only — no markdown syntax (no **, ##, backticks)
Return only the post content, no extra explanation.

Conversation:
{input.truncated()}
""",
        "ACTION_ITEMS": f"""
Extract every concrete action item from this AI conversation.
Format as a clean numbered list using plain numbers (1. 2. 3.), no markdown bullets or asterisks.
Each item should be specific and actionable (start with a verb).
Return only the numbered list, no extra explanation.

Conversation:
{input.truncated()}
"""
    }

    prompt = prompts.get(input.exportType)
    if not prompt:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid exportType. Must be one of: {', '.join(prompts.keys())}"
        )

    try:
        response = client.models.generate_content(model=MODEL_EXPORT, contents=prompt)
        return {"content": response.text, "exportType": input.exportType}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

class GenerateInput(BaseModel):
    idea: str
    category: str = "GENERAL"

@app.post("/generate-prompt")
async def generate_prompt(input: GenerateInput):
    prompt = f"""
You are an expert prompt engineer. A user wants to create a reusable AI prompt.

Their idea: {input.idea}
Category: {input.category}

Write a high quality, reusable prompt they can save and use repeatedly.
The prompt should:
- Be written in second person ("You are...", "Your task is...")
- Be specific and detailed enough to get consistent results
- Include placeholders in [BRACKETS] where the user should fill in their specific details
- Be professional and clear

Return only the prompt text, nothing else. No explanation, no title, no preamble.
"""
    try:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        return {"prompt": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
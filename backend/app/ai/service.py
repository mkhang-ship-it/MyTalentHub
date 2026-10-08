"""
AI Service Module for FTalentHub
Integrates with an OpenAI-compatible router (9router) / Gemini / Anthropic.
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CẤU HÌNH — đọc từ biến môi trường, KHÔNG sửa code khi đổi nhà cung cấp
# ---------------------------------------------------------------------------
# 9router (và mọi proxy OpenAI-compatible khác: OpenRouter, LiteLLM, vLLM…)
# dùng chung một kiểu gọi: POST {base}/chat/completions với Authorization Bearer.
# Base URL mặc định là địa chỉ 9router trên máy — sếp chỉ cần dán API key.
AI_BASE_URL = (os.getenv("AI_BASE_URL") or "http://localhost:20128/v1").rstrip("/")
# Để trống thì tự chọn model khả dụng từ /v1/models (xem _tu_dong_chon_model).
AI_MODEL = (os.getenv("AI_MODEL") or "").strip()

# Model Gemini dùng cho mọi lời gọi. Đọc từ biến môi trường để đổi model
# không cần sửa code; mặc định là model đang hoạt động (model cũ
# 'gemini-1.5-flash' đã bị Google thu hồi, gọi lên trả 404).
GEMINI_MODEL = os.getenv("GEMINI_MODEL") or "gemini-3.6-flash"

#: Số giây chờ tối đa cho một lời gọi AI. Proxy có thể phải xếp hàng và
#: fallback qua nhiều provider nên cần rộng hơn gọi Gemini trực tiếp.
AI_TIMEOUT_SECONDS = float(os.getenv("AI_TIMEOUT_SECONDS") or "60")

#: System prompt cho endpoint chat công khai (khách chưa đăng nhập).
#: Ngắn gọn, tiếng Việt, tập trung định hướng nghề nghiệp/kỹ năng/hoạt động.
PUBLIC_CHAT_SYSTEM_PROMPT = (
    "Bạn là trợ lý của FTalentHub, hỗ trợ học sinh về định hướng nghề nghiệp, "
    "kỹ năng và hoạt động ngoại khóa. Trả lời ngắn gọn, tối đa 3-4 câu, bằng "
    "tiếng Việt, thân thiện và thực tế; gợi ý cụ thể về ngành nghề, kỹ năng cần "
    "học và sân chơi phù hợp. Không phán xét hay ép buộc; tôn trọng sự lựa chọn "
    "của người học."
)


class AIUnavailableError(Exception):
    """AI không sẵn sàng hoặc trả lỗi.

    Khác với các hàm analyze/roadmap/chat cũ (âm thầm dùng fallback), endpoint
    công khai cần biết rõ để trả 503 thay vì bịa câu trả lời.
    """


class AIProvider(Enum):
    OPENAI_COMPAT = "openai_compat"   # 9router / OpenRouter / mọi proxy OpenAI-compatible
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"


class _RouterError(Exception):
    """Lỗi từ proxy OpenAI-compatible. Giữ `status` để biết lỗi gì."""

    def __init__(self, message: str, status: Optional[int] = None):
        super().__init__(message)
        self.status = status


def _noi_dung_sse(text: str) -> str:
    """Gom nội dung từ các dòng SSE `data: {...}` (bỏ qua dòng `[DONE]`)."""
    doan: List[str] = []
    for dong in text.splitlines():
        dong = dong.strip()
        if not dong.startswith("data:"):
            continue
        phan = dong[5:].strip()
        if not phan or phan == "[DONE]":
            continue
        try:
            obj = json.loads(phan)
        except ValueError:
            continue
        for ch in obj.get("choices") or []:
            if not isinstance(ch, dict):
                continue
            delta = ch.get("delta") or {}
            noi_dung = delta.get("content") if isinstance(delta, dict) else None
            if isinstance(noi_dung, str):
                doan.append(noi_dung)
    return "".join(doan)


def _noi_dung_message(value: Any) -> str:
    """Lấy text từ `message.content`, chịu được dạng khối nội dung."""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(
            b.get("text", "") for b in value if isinstance(b, dict) and isinstance(b.get("text"), str)
        )
    return ""


def _rut_noi_dung(text: str) -> str:
    """Rút câu trả lời từ body của proxy.

    9router trả `content-type: text/event-stream` NGAY CẢ KHI không bật stream:
    body là một JSON hoàn chỉnh rồi gắn thêm `data: [DONE]`. `json.loads` sẽ
    vỡ với lỗi "Extra data" vì có dữ liệu thừa sau JSON, nên phải đọc bằng
    `raw_decode` (tự dừng ở cuối JSON, bỏ qua phần thừa). Còn nếu body là
    SSE thật (nhiều dòng `data:`) thì gom nội dung các chunk `delta`.
    """
    body = (text or "").lstrip()
    if not body:
        raise _RouterError("AI trả về nội dung rỗng.")

    if body.startswith("data:"):
        noi_dung = _noi_dung_sse(body)
        if not noi_dung.strip():
            raise _RouterError("AI trả về dữ liệu không đúng định dạng.")
        return noi_dung

    try:
        # raw_decode bỏ qua mọi thứ nằm sau JSON, không cần tự cắt chuỗi.
        data, _ = json.JSONDecoder().raw_decode(body)
    except ValueError as exc:
        raise _RouterError("AI trả về dữ liệu không đúng định dạng.") from exc

    choices = data.get("choices") if isinstance(data, dict) else None
    if not choices:
        raise _RouterError("AI trả về dữ liệu không đúng định dạng.")
    first = choices[0]
    message = first.get("message") if isinstance(first, dict) else None
    noi_dung = _noi_dung_message(message.get("content") if isinstance(message, dict) else None)
    if not noi_dung.strip():
        raise _RouterError("AI trả về nội dung rỗng.")
    return noi_dung


def _loi_roi(resp: Any) -> str:
    """Rút thông điệp lỗi từ response của proxy.

    Chỉ lấy `error.message`; KHÔNG ghi nguyên body (có thể chứa key trong
    thông báo gỡ lỗi của một số proxy).
    """
    try:
        err = resp.json().get("error")
        if isinstance(err, dict):
            msg = err.get("message")
            if isinstance(msg, str) and msg.strip():
                return msg.strip()
        if isinstance(err, str) and err.strip():
            return err.strip()
    except Exception:
        pass
    return f"AI trả về lỗi {resp.status_code}"


def _loi_la_thieu_model(exc: _RouterError) -> bool:
    """Lỗi này có phải do không tìm thấy model không."""
    text = str(exc).lower()
    return any(
        k in text
        for k in ("model not found", "unknown model", "no such model", "invalid model", "does not exist")
    )


def _chon_provider_mac_dinh() -> AIProvider:
    """Chọn provider theo biến môi trường AI_PROVIDER.

    Mặc định "auto": có AI_API_KEY thì dùng proxy 9router, không thì lùi về
    Gemini/Anthropic. Nhờ vậy sếp chỉ cần DÁN KEY là chạy, không phải sửa
    thêm biến nào khác; xoá key thì tự quay lại nhà cung cấp cũ.
    """
    lua_chon = (os.getenv("AI_PROVIDER") or "auto").strip().lower()
    if lua_chon in ("openai_compat", "9router", "router", "openai"):
        return AIProvider.OPENAI_COMPAT
    if lua_chon == "gemini":
        return AIProvider.GEMINI
    if lua_chon == "anthropic":
        return AIProvider.ANTHROPIC
    # auto
    if os.getenv("AI_API_KEY"):
        return AIProvider.OPENAI_COMPAT
    if os.getenv("GEMINI_API_KEY"):
        return AIProvider.GEMINI
    if os.getenv("ANTHROPIC_API_KEY"):
        return AIProvider.ANTHROPIC
    # Chưa có key nào: chọn router để thông báo lỗi nói đúng việc cần làm.
    return AIProvider.OPENAI_COMPAT


@dataclass
class StudentProfile:
    """Student data for AI analysis"""
    id: int
    full_name: str
    class_name: str
    grade: int
    talent_score: float
    experience_hours: float
    interests: Optional[str]
    bio: Optional[str]
    assessments: List[Dict[str, Any]]
    skills: List[Dict[str, Any]]
    evaluations: List[Dict[str, Any]]
    activities: List[Dict[str, Any]]
    badges: List[Dict[str, Any]]


@dataclass
class AIAnalysisResult:
    """Result of AI analysis"""
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommended_fields: List[str]
    career_suggestions: List[str]
    confidence_score: float


@dataclass
class AIRoadmapResult:
    """Result of AI roadmap generation"""
    months: List[Dict[str, Any]]
    overall_goal: str
    key_milestones: List[str]


class AIService:
    """Main AI service for generating suggestions"""
    
    def __init__(self, provider: Optional[AIProvider] = None):
        # Truyền None ⇒ tự chọn theo AI_PROVIDER / key có sẵn trong .env.
        self.provider = provider or _chon_provider_mac_dinh()
        self.api_key = self._get_api_key()
        self.client = None
        #: Model đã dùng thực tế. Rỗng nghĩa là chưa chốt, sẽ tự dò từ /v1/models.
        self.model = AI_MODEL
        self._init_client()
    
    def _get_api_key(self) -> Optional[str]:
        """Get API key from environment"""
        if self.provider == AIProvider.OPENAI_COMPAT:
            return os.getenv("AI_API_KEY")
        if self.provider == AIProvider.GEMINI:
            return os.getenv("GEMINI_API_KEY")
        if self.provider == AIProvider.ANTHROPIC:
            return os.getenv("ANTHROPIC_API_KEY")
        return None

    def _init_client(self):
        """Initialize AI client.

        Với proxy OpenAI-compatible không cần SDK: dùng httpx gọi thẳng
        POST {AI_BASE_URL}/chat/completions nên nhẹ và không phụ thuộc gói cài thêm.
        """
        if not self.api_key:
            logger.warning(f"No API key found for {self.provider.value}. AI features will use fallback.")
            return

        try:
            if self.provider == AIProvider.OPENAI_COMPAT:
                import httpx
                self.client = httpx.AsyncClient(
                    base_url=AI_BASE_URL,
                    timeout=httpx.Timeout(AI_TIMEOUT_SECONDS, connect=10.0),
                )
            elif self.provider == AIProvider.GEMINI:
                # SDK mới 'google-genai'. SDK cũ 'google.generativeai' đã bị
                # Google ngừng hỗ trợ nên không dùng nữa.
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            elif self.provider == AIProvider.ANTHROPIC:
                import anthropic
                self.client = anthropic.Anthropic(api_key=self.api_key)
        except ImportError as e:
            logger.warning(f"AI provider library not installed: {e}")
            self.client = None

    async def aclose(self) -> None:
        """Đóng HTTP client. Chỉ có ý nghĩa với provider dùng httpx."""
        client = self.client
        if client is not None and hasattr(client, "aclose"):
            self.client = None
            await client.aclose()
    
    async def _generate(
        self,
        prompt: str,
        as_json: bool,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Gọi đúng nhà cung cấp đang cấu hình. Gom chỗ rẽ nhánh về một chỗ."""
        if self.provider == AIProvider.GEMINI:
            return await self._call_gemini(prompt, as_json=as_json)
        if self.provider == AIProvider.ANTHROPIC:
            return await self._call_anthropic(prompt)
        return await self._call_openai_compat(prompt, as_json=as_json, messages=messages)

    async def analyze_student(self, profile: StudentProfile) -> AIAnalysisResult:
        """Analyze student profile and generate insights"""
        if not self.client:
            return self._fallback_analysis(profile)
        
        prompt = self._build_analysis_prompt(profile)
        
        try:
            response = await self._generate(prompt, as_json=True)
            return self._parse_analysis_response(response, profile)
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return self._fallback_analysis(profile)
    
    async def generate_roadmap(self, profile: StudentProfile, analysis: AIAnalysisResult) -> AIRoadmapResult:
        """Generate 3-month personalized roadmap"""
        if not self.client:
            return self._fallback_roadmap(profile, analysis)
        
        prompt = self._build_roadmap_prompt(profile, analysis)
        
        try:
            response = await self._generate(prompt, as_json=True)
            return self._parse_roadmap_response(response, profile)
        except Exception as e:
            logger.error(f"AI roadmap failed: {e}")
            return self._fallback_roadmap(profile, analysis)
    
    async def chat_with_student(self, profile: StudentProfile, message: str, context: List[Dict] = None) -> str:
        """Chat with student using AI"""
        if not self.client:
            return self._fallback_chat(message)
        
        prompt = self._build_chat_prompt(profile, message, context or [])
        
        try:
            return await self._generate(prompt, as_json=False)
        except Exception as e:
            logger.error(f"AI chat failed: {e}")
            return self._fallback_chat(message)
    
    async def chat_public(self, message: str, history: List[Dict[str, str]] = None) -> str:
        """Chat công khai cho khách chưa đăng nhập.

        Khác với `chat_with_student` (âm thầm fallback), hàm này NÉM
        AIUnavailableError khi thiếu key hoặc AI lỗi để router trả 503.
        Tuyệt đối không để lộ key/stack trace ra ngoài.
        """
        if not self.client:
            raise AIUnavailableError(
                "Trợ lý AI chưa được cấu hình. Hãy dán API key vào dòng AI_API_KEY "
                "trong backend/.env rồi khởi động lại backend."
            )

        prompt = self._build_public_chat_prompt(message, history or [])
        try:
            # Proxy OpenAI-compatible nhận đúng vai trò system/user/assistant;
            # Gemini/Anthropic thì dùng bản chuỗi đã gộp ở trên.
            messages = (
                self._build_public_chat_messages(message, history or [])
                if self.provider == AIProvider.OPENAI_COMPAT
                else None
            )
            reply = await self._generate(prompt, as_json=False, messages=messages)
        except AIUnavailableError:
            raise
        except Exception as e:
            # Nhận diện lỗi cấu hình để thông báo dùng được, còn lại thì giấu.
            if isinstance(e, _RouterError):
                logger.error("Public AI chat lỗi (%s): %s", e.status, str(e)[:200])
                if e.status in (401, 403):
                    raise AIUnavailableError(
                        "AI từ chối API key. Hãy kiểm tra lại key trong backend/.env."
                    )
                if _loi_la_thieu_model(e):
                    raise AIUnavailableError(
                        "Proxy AI chưa có model phù hợp. Hãy đặt AI_MODEL trong backend/.env."
                    )
                if not self.model:
                    raise AIUnavailableError(
                        "Không kết nối được proxy AI. Hãy kiểm tra 9router còn chạy không."
                    )
            else:
                logger.error("Public AI chat failed: %s", type(e).__name__)
            raise AIUnavailableError("Trợ lý AI đang bận, vui lòng thử lại sau.")

        reply = (reply or "").strip()
        if not reply:
            raise AIUnavailableError("Trợ lý AI chưa trả về nội dung, vui lòng thử lại.")
        return reply
    
    # ============================================================
    # PROMPT TEMPLATES
    # ============================================================
    
    def _build_public_chat_messages(self, message: str, history: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Dựng đúng cấu trúc messages cho chat công khai.

        Quan trọng: system prompt phải nằm ở role "system" chứ không gộp vào
        tin nhắn "user". Khi gộp, model hiểu nhầm đó là người dùng đang kể
        chuyện nên nó tự nhận vai trò của chính nó — đã xảy ra thật: robot
        tự giới thiệu là "trợ lý Kira AI" rồi trả lời về gói cước, thanh toán
        thay vì định hướng nghề nghiệp.
        """
        msgs: List[Dict[str, str]] = [{"role": "system", "content": PUBLIC_CHAT_SYSTEM_PROMPT}]
        for turn in history[-10:]:
            role = turn.get("role")
            content = (turn.get("content") or "").strip()
            if not content:
                continue
            msgs.append({"role": "user" if role == "user" else "assistant", "content": content})
        msgs.append({"role": "user", "content": message})
        return msgs

    def _build_public_chat_prompt(self, message: str, history: List[Dict[str, str]]) -> str:
        """Bản chuỗi của prompt chat công khai — dùng cho Gemini/Anthropic."""
        lines = [PUBLIC_CHAT_SYSTEM_PROMPT, ""]
        for turn in history[-10:]:
            role = turn.get("role")
            content = (turn.get("content") or "").strip()
            if not content:
                continue
            label = "Người dùng" if role == "user" else "Trợ lý"
            lines.append(f"{label}: {content}")
        lines.append(f"Người dùng: {message}")
        lines.append("Trợ lý:")
        return "\n".join(lines)
    
    def _build_analysis_prompt(self, profile: StudentProfile) -> str:
        assessments_text = "\n".join([
            f"- {a['test_type'].upper()}: {a['result']} ({a['date']})"
            for a in profile.assessments
        ]) or "Chưa có bài test nào"
        
        skills_text = "\n".join([
            f"- {s['name']}: Level {s['level']}/10"
            for s in profile.skills
        ]) or "Chưa có kỹ năng được ghi nhận"
        
        evals_text = "\n".join([
            f"- {e['activity']}: {e['total']}/100 ({e['xep_loai']}) - {e['comment']}"
            for e in profile.evaluations
        ]) or "Chưa có đánh giá nào"
        
        activities_text = "\n".join([
            f"- {a['title']} ({a['field']}): {a['hours']}h, status: {a['status']}"
            for a in profile.activities
        ]) or "Chưa tham gia hoạt động nào"
        
        return f"""
Bạn là chuyên gia tư vấn định hướng nghề nghiệp và phát triển năng lực cho học sinh THPT tại Việt Nam.

HỒ SƠ HỌC SINH:
- Họ tên: {profile.full_name}
- Lớp: {profile.class_name} (Khối {profile.grade})
- Điểm năng lực: {profile.talent_score}/100
- Giờ trải nghiệm: {profile.experience_hours}h
- Sở thích: {profile.interests or 'Chưa cập nhật'}
- Tự giới thiệu: {profile.bio or 'Chưa có'}

KẾT QUẢ TEST NĂNG KHIẾU:
{assessments_text}

KỸ NĂNG (thang 0-10):
{skills_text}

ĐÁNH GIÁ TỪ GIÁO VIÊN/HLV:
{evals_text}

HOẠT ĐỘNG ĐÃ THAM GIA:
{activities_text}

NHIỆM VỤ: Phân tích toàn diện năng lực học sinh và đưa ra:
1. Tóm tắt năng lực (3-5 câu)
2. Điểm mạnh (3-5 mục)
3. Điểm yếu/cần cải thiện (3-5 mục)
4. Lĩnh vực phù hợp (3-5 lĩnh vực từ: Kỹ thuật, Nghệ thuật, Xã hội, Doanh nghiệp, Tự nhiên, Học thuật, Thể thao, Sáng tạo)
5. Gợi ý nghề nghiệp (3-5 nghề)
6. Điểm tin cậy (0-100)

TRẢ VỀ DẠNG JSON:
{{
  "summary": "...",
  "strengths": [...],
  "weaknesses": [...],
  "recommended_fields": [...],
  "career_suggestions": [...],
  "confidence_score": 0-100
}}
"""
    
    def _build_roadmap_prompt(self, profile: StudentProfile, analysis: AIAnalysisResult) -> str:
        return f"""
Dựa trên phân tích năng lực sau, hãy tạo lộ trình 3 tháng cá nhân hóa:

PHÂN TÍCH:
- Tóm tắt: {analysis.summary}
- Điểm mạnh: {', '.join(analysis.strengths)}
- Điểm yếu: {', '.join(analysis.weaknesses)}
- Lĩnh vực phù hợp: {', '.join(analysis.recommended_fields)}
- Nghề gợi ý: {', '.join(analysis.career_suggestions)}

HỌC SINH: {profile.full_name}, Khối {profile.grade}, Điểm: {profile.talent_score}/100, Giờ: {profile.experience_hours}h

NHIỆM VỤ: Tạo lộ trình 3 tháng với:
1. Mục tiêu tổng quát
2. 3 giai đoạn (Tháng 1, 2, 3) - mỗi giai đoạn có:
   - Mục tiêu chính
   - 3-5 hành động cụ thể
   - Kết quả mong đợi
   - Hoạt động/khóa học gợi ý
3. Các mốc quan trọng (milestones)

TRẢ VỀ DẠNG JSON:
{{
  "overall_goal": "...",
  "months": [
    {{"month": 1, "title": "...", "goal": "...", "actions": [...], "expected_outcome": "...", "suggested_activities": [...]}},
    {{"month": 2, "title": "...", "goal": "...", "actions": [...], "expected_outcome": "...", "suggested_activities": [...]}},
    {{"month": 3, "title": "...", "goal": "...", "actions": [...], "expected_outcome": "...", "suggested_activities": [...]}}
  ],
  "key_milestones": [...]
}}
"""
    
    def _build_chat_prompt(self, profile: StudentProfile, message: str, context: List[Dict]) -> str:
        context_text = "\n".join([f"{c['role']}: {c['content']}" for c in context[-5:]]) if context else "Chưa có hội thoại trước"
        
        return f"""
Bạn là trợ lý AI thân thiện, hỗ trợ học sinh {profile.full_name} (Khối {profile.grade}) về định hướng nghề nghiệp, kỹ năng, hoạt động.

NGỮ CẢNH: {context_text}

HỌC SINH HỎI: {message}

Hãy trả lời tự nhiên, khuyến khích, thực tế, bằng tiếng Việt. Tập trung vào định hướng nghề nghiệp, kỹ năng, hoạt động ngoại khóa.
"""
    
    # ============================================================
    # AI PROVIDER CALLS
    # ============================================================
    
    async def _call_gemini(self, prompt: str, as_json: bool = False) -> str:
        """Gọi Gemini qua SDK mới 'google-genai'.

        as_json=True  → buộc trả JSON (dùng cho analyze + roadmap).
        as_json=False → trả văn bản tự nhiên (dùng cho chat); TUYỆT ĐỐI không
        truyền response_mime_type, nếu không chat sẽ nhận về JSON.
        """
        config = {"temperature": 0.7, "max_output_tokens": 2048}
        if as_json:
            config["response_mime_type"] = "application/json"
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=GEMINI_MODEL,
            contents=prompt,
            config=config,
        )
        return response.text
    
    async def _call_anthropic(self, prompt: str) -> str:
        response = await asyncio.to_thread(
            self.client.messages.create,
            model="claude-3-haiku-20240307",
            max_tokens=2048,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    # ------------------------------------------------------------------
    # PROXY OPENAI-COMPATIBLE (9router, OpenRouter, LiteLLM, vLLM…)
    # ------------------------------------------------------------------

    async def _post_chat(self, payload: Dict[str, Any]) -> str:
        """POST /chat/completions và rút phần text của câu trả lời đầu tiên."""
        # stream=false để mong nhận JSON thuần; bên dưới vẫn phòng thủ cho cả SSE.
        body = dict(payload)
        body.setdefault("stream", False)
        try:
            resp = await self.client.post(
                "/chat/completions",
                json=body,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
        except Exception as exc:  # lỗi mạng, timeout, proxy không chạy
            raise _RouterError(f"Không kết nối được AI: {type(exc).__name__}") from exc

        if resp.status_code >= 400:
            raise _RouterError(_loi_roi(resp), resp.status_code)

        return _rut_noi_dung(resp.text)

    async def _liet_ke_model(self) -> List[str]:
        """Lấy danh sách model mà proxy đang phục vụ."""
        try:
            resp = await self.client.get(
                "/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            if resp.status_code >= 400:
                return []
            data = resp.json().get("data") or []
            return [str(m.get("id")) for m in data if isinstance(m, dict) and m.get("id")]
        except Exception as exc:
            logger.warning("Không đọc được /models: %s", type(exc).__name__)
            return []

    @staticmethod
    def _model_chat_duoc(models: List[str]) -> Optional[str]:
        """Chọn một model thích hợp để chat.

        Bỏ qua loại không chat được (image/video/tts/embedding) vì gọi chúng
        bằng /chat/completions sẽ lỗi. Ưu tiên model flash/rẻ cho chatbot
        hỏi đáp, có kèm ký tự phân loại provider để câu trả lời đúng thương hiệu.
        """
        loai_bo = ("image", "video", "tts", "speech", "embed", "audio", "whisper")
        candidates = [m for m in models if not any(k in m.lower() for k in loai_bo)]
        if not candidates:
            return None
        for uu_tien in ("flash", "mini", "free", "lite"):
            for m in candidates:
                if uu_tien in m.lower():
                    return m
        return candidates[0]

    async def _tu_dong_chon_model(self) -> str:
        """Chốt model dùng cho các lời gọi sau. Ném lỗi nếu không có model nào."""
        if self.model:
            return self.model
        chon = self._model_chat_duoc(await self._liet_ke_model())
        if not chon:
            raise _RouterError(
                "Không tìm thấy model nào. Hãy đặt AI_MODEL trong backend/.env."
            )
        logger.info("Tự chọn model AI: %s", chon)
        self.model = chon
        return chon

    async def _call_openai_compat(
        self,
        prompt: str,
        as_json: bool = False,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Gọi AI qua proxy OpenAI-compatible.

        Truyền `messages` thì dùng nguyên cấu trúc (kèm role system); bỏ trống
        thì coi `prompt` là một tin nhắn user đơn lẻ.

        as_json=True  → thêm response_format để bắt buộc trả JSON (analyze/roadmap).
        as_json=False → để nguyên văn bản tự nhiên (chat); TUYỆT ĐỐI không thêm
        response_format, nếu không câu trả lời chat sẽ bị bọc JSON.

        Danh sách model của proxy thay đổi theo tài khoản, nên khi gặp lỗi
        "không tìm thấy model" sẽ tự dò lại /models rồi thử model khác đúng
        một lần — nhờ vậy sếp không phải chỉnh tay AI_MODEL khi 9router đổi model.
        """
        model = await self._tu_dong_chon_model()
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages if messages else [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        if as_json:
            payload["response_format"] = {"type": "json_object"}

        try:
            return await self._post_chat(payload)
        except _RouterError as exc:
            if not _loi_la_thieu_model(exc):
                raise
            logger.warning("Model '%s' không dùng được, đang dò model khác.", model)
            # Xoá model đã chốt để _tu_dong_chon_model dò lại từ /models.
            self.model = ""
            thu_lai = await self._tu_dong_chon_model()
            if thu_lai == model:
                raise
            payload["model"] = thu_lai
            return await self._post_chat(payload)
    
    # ============================================================
    # RESPONSE PARSING
    # ============================================================
    
    def _parse_analysis_response(self, response: str, profile: StudentProfile) -> AIAnalysisResult:
        try:
            data = json.loads(response)
            return AIAnalysisResult(
                summary=data.get("summary", ""),
                strengths=data.get("strengths", []),
                weaknesses=data.get("weaknesses", []),
                recommended_fields=data.get("recommended_fields", []),
                career_suggestions=data.get("career_suggestions", []),
                confidence_score=data.get("confidence_score", 70)
            )
        except:
            return self._fallback_analysis(profile)
    
    def _parse_roadmap_response(self, response: str, profile: StudentProfile) -> AIRoadmapResult:
        try:
            data = json.loads(response)
            return AIRoadmapResult(
                months=data.get("months", []),
                overall_goal=data.get("overall_goal", ""),
                key_milestones=data.get("key_milestones", [])
            )
        except:
            return self._fallback_roadmap(profile, None)
    
    # ============================================================
    # FALLBACK (when no AI provider available)
    # ============================================================
    
    def _fallback_analysis(self, profile: StudentProfile) -> AIAnalysisResult:
        # Rule-based analysis based on assessments and skills
        top_field = "Kỹ thuật"
        if profile.assessments:
            for a in profile.assessments:
                if a['test_type'] == 'holland' and 'Kỹ thuật' in a['result']:
                    top_field = "Kỹ thuật"
                    break
                elif 'Nghệ thuật' in a['result']:
                    top_field = "Nghệ thuật"
                    break
        
        field_map = {
            "Kỹ thuật": ["Lập trình viên", "Kỹ sư IoT", "Kỹ sư nhúng", "Data Engineer"],
            "Nghệ thuật": ["Designer", "Content Creator", "UI/UX Designer", "Video Editor"],
            "Xã hội": ["Giáo viên", "Tư vấn viên", "Nhân sự", "Community Manager"],
            "Doanh nghiệp": ["Quản lý dự án", "Marketing", "Sales", "Khởi nghiệp"],
            "Tự nhiên": ["Nghiên cứu sinh", "Khoa học dữ liệu", "Môi trường"],
            "Học thuật": ["Giảng viên", "Nghiên cứu viên", "Phân tích chính sách"],
        }
        
        careers = field_map.get(top_field, ["Chuyên gia IT", "Data Analyst", "Project Manager"])
        
        return AIAnalysisResult(
            summary=f"{profile.full_name} là học sinh khối {profile.grade} với điểm năng lực {profile.talent_score}/100, có {profile.experience_hours}h trải nghiệm. Sở thích chính: {profile.interests or 'chưa xác định'}.",
            strengths=["Tích cực tham gia hoạt động", "Có định hướng rõ ràng", "Khả năng học hỏi tốt"],
            weaknesses=["Cần tích lũy thêm giờ trải nghiệm", "Chưa có chứng chỉ chuyên sâu", "Kỹ năng mềm cần rèn luyện"],
            recommended_fields=[top_field, "Sáng tạo", "Kỹ thuật"],
            career_suggestions=careers[:4],
            confidence_score=75
        )
    
    def _fallback_roadmap(self, profile: StudentProfile, analysis: Optional[AIAnalysisResult]) -> AIRoadmapResult:
        field = analysis.recommended_fields[0] if analysis and analysis.recommended_fields else "Kỹ thuật"
        
        roadmaps = {
            "Kỹ thuật": [
                {"month": 1, "title": "Cơ bản lập trình & IoT", "goal": "Nắm vững Python/C++ cơ bản, hiểu Arduino", "actions": ["Hoàn thành khóa Python cơ bản", "Tham gia IoT Lab", "Làm bài tập Arduino hàng ngày"], "expected_outcome": "Làm được dự án LED/động cơ đơn giản", "suggested_activities": ["IoT Lab", "Workshop Drone"]},
                {"month": 2, "title": "Dự án IoT thực tế", "goal": "Xây dựng dự án IoT hoàn chỉnh", "actions": ["Thiết kế hệ thống tưới cây tự động", "Lập trình MQTT", "Viết báo cáo kỹ thuật"], "expected_outcome": "Dự án demo được", "suggested_activities": ["IoT Lab", "Robotics Club"]},
                {"month": 3, "title": "Mở rộng & Portfolio", "goal": "Hoàn thiện portfolio, chuẩn bị thực tập", "actions": ["Deploy dự án lên GitHub", "Viết CV kỹ thuật", "Ứng dụng thực tập"], "expected_outcome": "Sẵn sàng ứng dụng thực tập", "suggested_activities": ["Startup Challenge", "Hackathon"]},
            ],
            "Nghệ thuật": [
                {"month": 1, "title": "Công cụ thiết kế", "goal": "Làm chủ Figma/Canva/Blender cơ bản", "actions": ["Khóa Figma 2 tuần", "Thực hành UI/ài đơn giản", "Học Canva Pro"], "expected_outcome": "Thiết kế được poster/UI cơ bản", "suggested_activities": ["CLB Vẽ & Thiết kế", "Sáng tạo nội dung"]},
                {"month": 2, "title": "Dự án thực tế", "goal": "Thiết kế sản phẩm hoàn chỉnh", "actions": ["Thiết kế brand identity", "Làm video giới thiệu", "In 3D mô hình"], "expected_outcome": "Portfolio 3-4 dự án", "suggested_activities": ["Triển lãm tranh 3D", "Workshop 3D Printing"]},
                {"month": 3, "title": "Chuyên nghiệp hóa", "goal": "Chuẩn bị CV, ứng dụng thực tập", "actions": ["Xây dựng Behance/Portfolio", "Viết CV Creative", "Ứng dụng thực tập Design"], "expected_outcome": "Sẵn sàng thực tập", "suggested_activities": ["Sáng tạo nội dung số", "Freelance project"]},
            ],
        }
        
        months = roadmaps.get(field, roadmaps["Kỹ thuật"])
        
        return AIRoadmapResult(
            months=months,
            overall_goal=f"Phát triển năng lực {field}, xây dựng portfolio, sẵn sàng thực tập/việc làm",
            key_milestones=[
                "Hoàn thành khóa học nền tảng",
                "Có dự án demo đầu tiên",
                "Portfolio 3+ dự án",
                "Ứng dụng được thực tập"
            ]
        )
    
    def _fallback_chat(self, message: str) -> str:
        fallbacks = {
            "nghề": "Dựa trên năng lực của bạn, tôi gợi ý các nghề phù hợp với lĩnh vực Kỹ thuật/Nghệ thuật/Doanh nghiệp. Bạn có thể làm bài test Holland/DISC để chính xác hơn.",
            "kỹ năng": "Bạn nên phát triển: 1) Kỹ năng chuyên môn (lập trình/thiết kế), 2) Kỹ năng mềm (giao tiếp, teamwork), 3) Tiếng Anh. Tham gia sân chơi phù hợp để rèn luyện.",
            "hoạt động": "Có nhiều sân chơi: IoT Lab, Robotics, CLB Vẽ, Startup Challenge, Bóng rổ... Chọn theo sở thích và nguyện vọng nghề nghiệp.",
            "default": "Tôi là trợ lý AI của FTalentHub. Hãy hỏi tôi về: định hướng nghề nghiệp, kỹ năng cần học, sân chơi phù hợp, lộ trình phát triển, hoặc bất cứ điều gì về tương lai của bạn!"
        }
        
        msg_lower = message.lower()
        for key, response in fallbacks.items():
            if key in msg_lower:
                return response
        return fallbacks["default"]


# ============================================================
# SINGLETON INSTANCE
# ============================================================

_ai_service_instance: Optional[AIService] = None


def get_ai_service(provider: Optional[AIProvider] = None) -> AIService:
    """Get or create AI service singleton.

    Không truyền `provider` ⇒ tự chọn theo AI_PROVIDER và key có sẵn trong .env.
    """
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService(provider)
    return _ai_service_instance


# ============================================================
# CONVENIENCE FUNCTIONS
# ============================================================

async def analyze_student_profile(profile: StudentProfile) -> AIAnalysisResult:
    """Analyze student profile - convenience function"""
    service = get_ai_service()
    return await service.analyze_student(profile)


async def generate_student_roadmap(profile: StudentProfile, analysis: AIAnalysisResult) -> AIRoadmapResult:
    """Generate student roadmap - convenience function"""
    service = get_ai_service()
    return await service.generate_roadmap(profile, analysis)


async def chat_with_ai(profile: StudentProfile, message: str, context: List[Dict] = None) -> str:
    """Chat with AI - convenience function"""
    service = get_ai_service()
    return await service.chat_with_student(profile, message, context)


async def chat_public(message: str, history: List[Dict[str, str]] = None) -> str:
    """Chat công khai (khách chưa đăng nhập) - convenience function.

    Ném AIUnavailableError khi AI không sẵn sàng hoặc lỗi.
    """
    service = get_ai_service()
    return await service.chat_public(message, history)
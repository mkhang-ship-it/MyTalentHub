"""
AI Service Module for FTalentHub
Integrates with Gemini/Anthropic for dynamic AI suggestions
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AIProvider(Enum):
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"


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
    
    def __init__(self, provider: AIProvider = AIProvider.GEMINI):
        self.provider = provider
        self.api_key = self._get_api_key()
        self.client = None
        self._init_client()
    
    def _get_api_key(self) -> Optional[str]:
        """Get API key from environment"""
        if self.provider == AIProvider.GEMINI:
            return os.getenv("GEMINI_API_KEY")
        elif self.provider == AIProvider.ANTHROPIC:
            return os.getenv("ANTHROPIC_API_KEY")
        return None
    
    def _init_client(self):
        """Initialize AI client"""
        if not self.api_key:
            logger.warning(f"No API key found for {self.provider.value}. AI features will use fallback.")
            return
        
        try:
            if self.provider == AIProvider.GEMINI:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel('gemini-1.5-flash')
            elif self.provider == AIProvider.ANTHROPIC:
                import anthropic
                self.client = anthropic.Anthropic(api_key=self.api_key)
        except ImportError as e:
            logger.warning(f"AI provider library not installed: {e}")
            self.client = None
    
    async def analyze_student(self, profile: StudentProfile) -> AIAnalysisResult:
        """Analyze student profile and generate insights"""
        if not self.client:
            return self._fallback_analysis(profile)
        
        prompt = self._build_analysis_prompt(profile)
        
        try:
            if self.provider == AIProvider.GEMINI:
                response = await self._call_gemini(prompt)
            else:
                response = await self._call_anthropic(prompt)
            
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
            if self.provider == AIProvider.GEMINI:
                response = await self._call_gemini(prompt)
            else:
                response = await self._call_anthropic(prompt)
            
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
            if self.provider == AIProvider.GEMINI:
                response = await self._call_gemini(prompt)
            else:
                response = await self._call_anthropic(prompt)
            return response
        except Exception as e:
            logger.error(f"AI chat failed: {e}")
            return self._fallback_chat(message)
    
    # ============================================================
    # PROMPT TEMPLATES
    # ============================================================
    
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
    
    async def _call_gemini(self, prompt: str) -> str:
        import google.generativeai as genai
        response = await asyncio.to_thread(
            self.client.generate_content,
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                max_output_tokens=2048,
                response_mime_type="application/json"
            )
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


def get_ai_service(provider: AIProvider = AIProvider.GEMINI) -> AIService:
    """Get or create AI service singleton"""
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
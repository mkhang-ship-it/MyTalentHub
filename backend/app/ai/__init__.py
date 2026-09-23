"""AI Module - Dynamic AI suggestions using Gemini/Anthropic"""

from .service import AIService, StudentProfile, AIAnalysisResult, AIRoadmapResult, get_ai_service
from .router import router as ai_router

__all__ = [
    "AIService",
    "StudentProfile",
    "AIAnalysisResult", 
    "AIRoadmapResult",
    "get_ai_service",
    "ai_router",
]
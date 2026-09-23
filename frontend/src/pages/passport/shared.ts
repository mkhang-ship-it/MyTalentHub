export interface Passport {
  qr_code: string;
  updated_at: string;
  student: {
    id: number;
    full_name: string;
    class_name: string;
    grade: number;
    avatar_url: string | null;
    bio: string | null;
    interests: string | null;
    talent_score: number;
    experience_hours: number;
  };
  certificates: { title: string; issuer: string; issued_at: string | null }[];
  projects: { title: string; field: string; status: string; description: string | null }[];
  activities: { title: string; field: string; hours: number; role: string | null }[];
  skills: { name: string; level: number }[];
  badges: { code: string; name: string; icon: string; color: string }[];
}

export const FIELD_NAMES: Record<string, string> = {
  ky_thuat: "Kỹ thuật",
  nghe_thuat: "Nghệ thuật",
  kinh_doanh: "Kinh doanh",
  the_thao: "Thể thao",
  hoc_thuat: "Học thuật",
  sang_tao: "Sáng tạo",
};
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { PageTransition } from "./components/motion";
import { Loading } from "./components/ui";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";

import StudentDashboard from "./pages/student/Dashboard";
import StudentDiscover from "./pages/student/Discover";
import StudentActivities from "./pages/student/Activities";
import StudentCheckin from "./pages/student/Checkin";
import StudentBadges from "./pages/student/Badges";
import StudentRoadmap from "./pages/student/Roadmap";
import StudentStatistics from "./pages/student/Statistics";
import StudentEvaluations from "./pages/student/Evaluations";

import TeacherOverview from "./pages/teacher/Overview";
import TeacherActivities from "./pages/teacher/Activities";
import TeacherGrading from "./pages/teacher/Grading";
import TeacherStudents from "./pages/teacher/Students";
import TeacherClasses from "./pages/teacher/Classes";
import CoachOverview from "./pages/coach/Overview";

import SchoolOverview from "./pages/school/Overview";
import SchoolReports from "./pages/school/Reports";
import SchoolClasses from "./pages/school/Classes";

import EnterpriseOverview from "./pages/enterprise/Overview";
import EnterpriseInternships from "./pages/enterprise/Internships";
import EnterpriseSponsorships from "./pages/enterprise/Sponsorships";

// Tách route nặng ra khỏi bundle chính (code-split bằng React.lazy):
// - PassportPage kéo theo ba.js (three ~682 KB + GLTFLoader ~47 KB) — chỉ tải khi vào trang Passport
// - Profile/Analysis/Settings/Talents là các trang nặng riêng biệt
const StudentProfile = lazy(() => import("./pages/student/Profile"));
const SchoolAnalysis = lazy(() => import("./pages/school/Analysis"));
const SchoolSettings = lazy(() => import("./pages/school/Settings"));
const EnterpriseTalents = lazy(() => import("./pages/enterprise/Talents"));
const PassportPage = lazy(() => import("./pages/passport/Passport"));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
        Đang tải phiên đăng nhập…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleBoundary({ children }: { children: React.ReactNode }) {
  // Cho phép người đã đăng nhập truy cập mọi cổng (student|teacher|school|enterprise)
  // ở chế độ trải nghiệm. Giữ RequireAuth; /passport/:studentId vẫn hoạt động.
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Suspense hứng trang lazy khi tải chunk (route trong Layout có boundary riêng
          trong Layout.tsx để giữ nguyên khung điều hướng) */}
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <RoleBoundary>
                  <Layout />
                </RoleBoundary>
              </RequireAuth>
            }
          >
            {/* HỌC SINH */}
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/profile" element={<StudentProfile />} />
            <Route path="student/discover" element={<StudentDiscover />} />
            <Route path="student/activities" element={<StudentActivities />} />
            <Route path="student/checkin" element={<StudentCheckin />} />
            <Route path="student/badges" element={<StudentBadges />} />
            <Route path="student/roadmap" element={<StudentRoadmap />} />
            <Route path="student/statistics" element={<StudentStatistics />} />
            <Route path="student/evaluations" element={<StudentEvaluations />} />

            {/* GIÁO VIÊN */}
            <Route path="teacher" element={<TeacherOverview />} />
            <Route path="teacher/activities" element={<TeacherActivities />} />
            <Route path="teacher/grading" element={<TeacherGrading />} />
            <Route path="teacher/students" element={<TeacherStudents />} />
            <Route path="teacher/classes" element={<TeacherClasses />} />

            {/* HUẤN LUYỆN VIÊN */}
            <Route path="coach" element={<CoachOverview />} />
            <Route path="coach/activities" element={<TeacherActivities />} />
            <Route path="coach/grading" element={<TeacherGrading />} />
            <Route path="coach/students" element={<TeacherStudents />} />

            {/* NHÀ TRƯỜNG */}
            <Route path="school" element={<SchoolOverview />} />
            <Route path="school/analysis" element={<SchoolAnalysis />} />
            <Route path="school/reports" element={<SchoolReports />} />
            <Route path="school/classes" element={<SchoolClasses />} />
            <Route path="school/settings" element={<SchoolSettings />} />

            {/* DOANH NGHIỆP */}
            <Route path="enterprise" element={<EnterpriseOverview />} />
            <Route path="enterprise/talents" element={<EnterpriseTalents />} />
            <Route path="enterprise/internships" element={<EnterpriseInternships />} />
            <Route path="enterprise/sponsorships" element={<EnterpriseSponsorships />} />

            {/* TALENT PASSPORT */}
            <Route path="passport/:studentId" element={<PassportPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
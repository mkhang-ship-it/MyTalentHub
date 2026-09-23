import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { PageTransition } from "./components/motion";
import { AuthProvider, useAuth, roleHome } from "./auth/AuthContext";
import Login from "./pages/Login";
import Landing from "./pages/Landing";

import StudentDashboard from "./pages/student/Dashboard";
import StudentProfile from "./pages/student/Profile";
import StudentDiscover from "./pages/student/Discover";
import StudentActivities from "./pages/student/Activities";
import StudentCheckin from "./pages/student/Checkin";
import StudentBadges from "./pages/student/Badges";
import StudentRoadmap from "./pages/student/Roadmap";
import StudentStatistics from "./pages/student/Statistics";

import TeacherOverview from "./pages/teacher/Overview";
import TeacherActivities from "./pages/teacher/Activities";
import TeacherGrading from "./pages/teacher/Grading";
import TeacherStudents from "./pages/teacher/Students";

import SchoolOverview from "./pages/school/Overview";
import SchoolAnalysis from "./pages/school/Analysis";
import SchoolReports from "./pages/school/Reports";
import SchoolClasses from "./pages/school/Classes";

import EnterpriseOverview from "./pages/enterprise/Overview";
import EnterpriseTalents from "./pages/enterprise/Talents";
import EnterpriseInternships from "./pages/enterprise/Internships";
import EnterpriseSponsorships from "./pages/enterprise/Sponsorships";

import PassportPage from "./pages/passport/Passport";

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
  const { user } = useAuth();
  const location = useLocation();
  const section = location.pathname.split("/")[1];
  const roleSections = ["student", "teacher", "school", "enterprise"];

  if (user && roleSections.includes(section) && section !== user.role) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />

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

          {/* GIÁO VIÊN */}
          <Route path="teacher" element={<TeacherOverview />} />
          <Route path="teacher/activities" element={<TeacherActivities />} />
          <Route path="teacher/grading" element={<TeacherGrading />} />
          <Route path="teacher/students" element={<TeacherStudents />} />

          {/* NHÀ TRƯỜNG */}
          <Route path="school" element={<SchoolOverview />} />
          <Route path="school/analysis" element={<SchoolAnalysis />} />
          <Route path="school/reports" element={<SchoolReports />} />
          <Route path="school/classes" element={<SchoolClasses />} />

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
    </AuthProvider>
  );
}
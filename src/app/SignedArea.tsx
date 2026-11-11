import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import PageLoader from "@/components/PageLoader";
import ReleaseAppShell from "@/components/ReleaseAppShell";
import Login from "@/pages/Login";

// Everything that needs the database and the signed-in session. The login screen comes
// with this file; the rest of the app arrives only after signing in.
const Index = lazy(() => import("@/pages/Index"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const Home = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Index /> : <Login />;
};

const ReleaseWhenSessionKnown = () => {
  const { loading } = useAuth();
  return <ReleaseAppShell ready={!loading} />;
};

const SignedArea = () => (
  <AuthProvider>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <ReleaseWhenSessionKnown />
  </AuthProvider>
);

export default SignedArea;

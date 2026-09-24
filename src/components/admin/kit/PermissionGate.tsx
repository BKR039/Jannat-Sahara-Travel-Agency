import { type ReactNode } from "react";
import { useAdmin } from "@/components/admin/context";
import { type PermissionKey } from "@/lib/admin/permissions";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Page, EmptyState } from "@/components/admin/kit";

interface PermissionGateProps {
  permission?: PermissionKey;
  anyOf?: readonly PermissionKey[];
  allOf?: readonly PermissionKey[];
  superOnly?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  asPage?: boolean;
  pageTitle?: string;
}

/**
 * Declarative component-level and page-level permission gate.
 * If user lacks permission, renders the fallback or standard 403 Access Denied state.
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  superOnly = false,
  children,
  fallback,
  asPage = false,
  pageTitle = "صلاحية مقصورة",
}: PermissionGateProps) {
  const { isSuperAdmin, hasPermission, hasAnyPermission } = useAdmin();

  // 1. Super Admin bypasses all checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // 2. If superOnly is required and user is not super_admin
  if (superOnly && !isSuperAdmin) {
    return renderDenied();
  }

  // 3. Check single permission
  if (permission && !hasPermission(permission)) {
    return renderDenied();
  }

  // 4. Check anyOf
  if (anyOf && anyOf.length > 0 && !hasAnyPermission(anyOf)) {
    return renderDenied();
  }

  // 5. Check allOf
  if (allOf && allOf.length > 0) {
    const allPassed = allOf.every((p) => hasPermission(p));
    if (!allPassed) return renderDenied();
  }

  return <>{children}</>;

  function renderDenied() {
    if (fallback) return <>{fallback}</>;

    const content = (
      <EmptyState
        icon={ShieldAlert}
        title="صلاحية مقصورة"
        description="ليس لديك الصلاحيات الكافية للوصول إلى هذا القسم أو تنفيذ هذا الإجراء. يرجى مراجعة المسؤول الرئيسي."
        action={
          <Link to="/admin">
            <Button variant="outline">العودة إلى لوحة التحكم</Button>
          </Link>
        }
      />
    );

    if (asPage) {
      return (
        <Page
          title={pageTitle}
          description="تم تقييد الوصول وفقًا لسياسة الأمان والصلاحيات المحددة لحسابك."
        >
          {content}
        </Page>
      );
    }

    return content;
  }
}

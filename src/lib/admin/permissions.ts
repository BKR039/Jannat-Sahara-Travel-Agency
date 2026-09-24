/**
 * Centralized Permission Model for Jannat Sahara Travel Agency SaaS Admin.
 *
 * Provides typed permission keys, role-to-permission mapping, UI grouping,
 * and computation of effective permissions (inherited + custom overrides).
 */

export type AppRole = "super_admin" | "admin" | "staff";

export const PERMISSION_KEYS = [
  // Dashboard
  "dashboard.view",

  // Customers
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.delete",

  // Bookings & Requests
  "bookings.view",
  "bookings.create",
  "bookings.edit",
  "bookings.delete",

  // Leads & Sales Center
  "leads.view",
  "leads.create",
  "leads.edit",
  "leads.delete",

  // Trips / Packages
  "trips.view",
  "trips.create",
  "trips.edit",
  "trips.delete",

  // Hotels
  "hotels.view",
  "hotels.create",
  "hotels.edit",
  "hotels.delete",

  // Branches
  "branches.view",
  "branches.create",
  "branches.edit",
  "branches.delete",

  // Reports
  "reports.view",

  // CMS
  "cms.services",
  "cms.features",
  "cms.gallery",
  "cms.blog",
  "cms.testimonials",
  "cms.faq",

  // Settings
  "settings.view",
  "settings.edit",

  // Team
  "team.view",
  "team.invite",
  "team.edit",
  "team.deactivate",
  "team.delete",
  "team.change_role",
  "team.change_email",
  "team.reset_password",

  // Archive
  "archive.view",
  "archive.restore",
  "archive.delete",

  // Security
  "security.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/**
 * Default permissions granted to roles out of the box.
 * Super Admin implicitly has ALL permissions.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, readonly PermissionKey[]> = {
  super_admin: PERMISSION_KEYS,

  admin: [
    "dashboard.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "customers.delete",
    "bookings.view",
    "bookings.create",
    "bookings.edit",
    "bookings.delete",
    "leads.view",
    "leads.create",
    "leads.edit",
    "leads.delete",
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
    "hotels.view",
    "hotels.create",
    "hotels.edit",
    "hotels.delete",
    "branches.view",
    "branches.create",
    "branches.edit",
    "branches.delete",
    "reports.view",
    "archive.view",
    "archive.restore",
    "archive.delete",
    "cms.services",
    "cms.features",
    "cms.gallery",
    "cms.blog",
    "cms.testimonials",
    "cms.faq",
    "settings.view",
    "settings.edit",
    "team.view",
    "team.invite",
  ],

  staff: [
    "dashboard.view",
    "customers.view",
    "bookings.view",
    "leads.view",
    "leads.edit",
    "trips.view",
    "hotels.view",
    "branches.view",
  ],
};

export interface PermissionGroup {
  id: string;
  labelAr: string;
  permissions: {
    key: PermissionKey;
    labelAr: string;
    action: "view" | "create" | "edit" | "delete" | "manage";
  }[];
}

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    id: "dashboard",
    labelAr: "لوحة التحكم",
    permissions: [{ key: "dashboard.view", labelAr: "عرض الإحصائيات العامة", action: "view" }],
  },
  {
    id: "customers",
    labelAr: "العملاء",
    permissions: [
      { key: "customers.view", labelAr: "عرض العملاء", action: "view" },
      { key: "customers.create", labelAr: "إضافة عميل", action: "create" },
      { key: "customers.edit", labelAr: "تعديل عميل", action: "edit" },
      { key: "customers.delete", labelAr: "حذف عميل", action: "delete" },
    ],
  },
  {
    id: "leads",
    labelAr: "مركز المبيعات والـ Leads",
    permissions: [
      { key: "leads.view", labelAr: "عرض العملاء المحتملين (Leads)", action: "view" },
      { key: "leads.create", labelAr: "إضافة Lead يدويًا", action: "create" },
      { key: "leads.edit", labelAr: "تعديل الـ Lead والمتابعة والعروض", action: "edit" },
      { key: "leads.delete", labelAr: "حذف Lead", action: "delete" },
    ],
  },
  {
    id: "bookings",
    labelAr: "الحجوزات والطلبات",
    permissions: [
      { key: "bookings.view", labelAr: "عرض الحجوزات", action: "view" },
      { key: "bookings.create", labelAr: "إنشاء حجز", action: "create" },
      { key: "bookings.edit", labelAr: "تعديل الحجز وحالته", action: "edit" },
      { key: "bookings.delete", labelAr: "حذف الحجز", action: "delete" },
    ],
  },
  {
    id: "trips",
    labelAr: "الرحلات والباقات",
    permissions: [
      { key: "trips.view", labelAr: "عرض الباقات", action: "view" },
      { key: "trips.create", labelAr: "إضافة باقة", action: "create" },
      { key: "trips.edit", labelAr: "تعديل الباقة والأسعار", action: "edit" },
      { key: "trips.delete", labelAr: "حذف الباقة", action: "delete" },
    ],
  },
  {
    id: "hotels",
    labelAr: "الفنادق والإقامة",
    permissions: [
      { key: "hotels.view", labelAr: "عرض الفنادق", action: "view" },
      { key: "hotels.create", labelAr: "إضافة فندق", action: "create" },
      { key: "hotels.edit", labelAr: "تعديل الفندق", action: "edit" },
      { key: "hotels.delete", labelAr: "حذف الفندق", action: "delete" },
    ],
  },
  {
    id: "branches",
    labelAr: "الفروع ونقاط الاتصال",
    permissions: [
      { key: "branches.view", labelAr: "عرض الفروع", action: "view" },
      { key: "branches.create", labelAr: "إضافة فرع", action: "create" },
      { key: "branches.edit", labelAr: "تعديل بيانات الفرع", action: "edit" },
      { key: "branches.delete", labelAr: "حذف الفرع", action: "delete" },
    ],
  },
  {
    id: "reports",
    labelAr: "التقارير المالية والتشغيلية",
    permissions: [{ key: "reports.view", labelAr: "عرض وتصدير التقارير", action: "view" }],
  },
  {
    id: "cms",
    labelAr: "إدارة محتوى الموقع (CMS)",
    permissions: [
      { key: "cms.services", labelAr: "إدارة الخدمات", action: "manage" },
      { key: "cms.features", labelAr: "إدارة المميزات", action: "manage" },
      { key: "cms.gallery", labelAr: "إدارة المعرض", action: "manage" },
      { key: "cms.blog", labelAr: "إدارة المدونة والمقالات", action: "manage" },
      { key: "cms.testimonials", labelAr: "إدارة آراء العملاء", action: "manage" },
      { key: "cms.faq", labelAr: "إدارة الأسئلة الشائعة", action: "manage" },
    ],
  },
  {
    id: "settings",
    labelAr: "إعدادات المنصة والموقع",
    permissions: [
      { key: "settings.view", labelAr: "عرض إعدادات المنصة", action: "view" },
      { key: "settings.edit", labelAr: "تعديل وحفظ الإعدادات", action: "edit" },
    ],
  },
  {
    id: "team",
    labelAr: "فريق العمل والمستخدمين",
    permissions: [
      { key: "team.view", labelAr: "عرض قائمة الفريق", action: "view" },
      { key: "team.invite", labelAr: "دعوة عضو جديد", action: "create" },
      { key: "team.edit", labelAr: "تعديل بيانات العضو", action: "edit" },
      { key: "team.deactivate", labelAr: "تعطيل / تفعيل الحساب", action: "manage" },
      { key: "team.change_role", labelAr: "تغيير رتبة العضو", action: "manage" },
      { key: "team.change_email", labelAr: "تغيير البريد الإلكتروني", action: "manage" },
      { key: "team.reset_password", labelAr: "إرسال رابط استعادة كلمة المرور", action: "manage" },
      { key: "team.delete", labelAr: "حذف حساب عضو نهائيًا", action: "delete" },
    ],
  },
  {
    id: "archive",
    labelAr: "الأرشيف واستعادة البيانات",
    permissions: [
      { key: "archive.view", labelAr: "عرض السجلات المؤرشفة", action: "view" },
      { key: "archive.restore", labelAr: "استعادة السجلات المؤرشفة", action: "edit" },
      { key: "archive.delete", labelAr: "حذف السجلات نهائياً من الأرشيف", action: "delete" },
    ],
  },
  {
    id: "security",
    labelAr: "الأمان المتقدم والصلاحيات",
    permissions: [
      {
        key: "security.manage",
        labelAr: "إدارة الصلاحيات المخصصة وسجلات الأمان",
        action: "manage",
      },
    ],
  },
];

export interface CustomPermissionOverride {
  permission: string;
  granted: boolean;
}

/**
 * Computes the effective set of permissions for a user given their roles
 * and optional per-user overrides from public.user_permissions.
 */
export function computeEffectivePermissions(
  roles: readonly AppRole[],
  customOverrides?: readonly CustomPermissionOverride[] | null,
): Set<PermissionKey> {
  const result = new Set<PermissionKey>();

  // If super_admin, they have everything unconditionally
  if (roles.includes("super_admin")) {
    for (const p of PERMISSION_KEYS) {
      result.add(p);
    }
    return result;
  }

  // Base role permissions
  for (const role of roles) {
    const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
    for (const p of defaults) {
      result.add(p);
    }
  }

  // Custom overrides
  if (customOverrides && customOverrides.length > 0) {
    for (const ov of customOverrides) {
      const p = ov.permission as PermissionKey;
      if (PERMISSION_KEYS.includes(p)) {
        if (ov.granted) {
          result.add(p);
        } else {
          result.delete(p);
        }
      }
    }
  }

  return result;
}

export function hasPermissionInList(
  permissions: readonly PermissionKey[] | Set<PermissionKey>,
  required: PermissionKey,
): boolean {
  if (permissions instanceof Set) {
    return permissions.has(required);
  }
  return permissions.includes(required);
}

export function hasAnyPermissionInList(
  permissions: readonly PermissionKey[] | Set<PermissionKey>,
  required: readonly PermissionKey[],
): boolean {
  return required.some((p) => hasPermissionInList(permissions, p));
}

export function hasAllPermissionsInList(
  permissions: readonly PermissionKey[] | Set<PermissionKey>,
  required: readonly PermissionKey[],
): boolean {
  return required.every((p) => hasPermissionInList(permissions, p));
}

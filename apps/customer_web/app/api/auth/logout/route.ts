import { customerAuthRoutes } from "../../../../lib/auth/routes.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = customerAuthRoutes.logout;

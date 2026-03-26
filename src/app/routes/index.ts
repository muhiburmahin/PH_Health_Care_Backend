import { Router } from "express";
import { SpecialtyRoutes } from "../module/specialty/specialty.route";
import { AuthRoutes } from "../module/auth/auth.route";

const routes = Router();

routes.use("/specialties", SpecialtyRoutes)
routes.use("/auth", AuthRoutes)

export const IndexRoutes = routes
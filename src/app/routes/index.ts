import { Router } from "express";
import { SpecialtyRoutes } from "../module/specialty/specialty.route";

const routes = Router();

routes.use("/specialties", SpecialtyRoutes)

export const IndexRoutes = routes
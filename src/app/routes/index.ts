import { Router } from "express";
import { SpecialtyRoutes } from "../module/specialty/specialty.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { DoctorRoutes } from "../module/doctor/doctor.route";

const routers = Router();

routers.use("/specialties", SpecialtyRoutes)
routers.use("/auth", AuthRoutes)
routers.use("/users", UserRoutes)
routers.use('/doctors', DoctorRoutes);

export const IndexRoutes = routers
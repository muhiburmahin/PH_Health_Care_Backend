import { z } from "zod";
import { Gender } from "../../../generated/prisma/client";

const updateDoctorZodSchema = z.object({
    body: z.object({
        name: z.string().min(5, { message: "Name must be at least 5 characters" }).max(30, { message: "Name must be at most 30 characters" }).optional(),

        profilePhoto: z.string().url({ message: "Invalid profile photo URL" }).optional(),

        contactNumber: z.string().min(11, { message: "Contact number must be at least 11 characters" }).max(14, { message: "Contact number must be at most 14 characters" }).optional(),

        address: z.string().min(10, { message: "Address must be at least 10 characters" }).max(100, { message: "Address must be at most 100 characters" }).optional(),

        registrationNumber: z.string().optional(),

        experience: z.number().int({ message: "Experience must be an integer" }).nonnegative({ message: "Experience cannot be negative" }).optional(),

        gender: z.enum([Gender.MALE, Gender.FEMALE]).optional(),

        appointmentFee: z.number().nonnegative({ message: "Appointment fee cannot be negative" }).optional(),

        qualification: z.string().min(2, { message: "Qualification must be at least 2 characters" }).optional(),

        currentWorkPlace: z.string().min(2, { message: "Workplace must be at least 2 characters" }).optional(),

        designation: z.string().min(2, { message: "Designation must be at least 2 characters" }).optional(),

        specialties: z.array(z.string().uuid({ message: "Invalid Specialty ID" })).optional()
    })
});

export const DoctorValidation = {
    updateDoctorZodSchema
};
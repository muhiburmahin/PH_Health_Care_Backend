import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { DoctorService } from "./doctor.service";

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorService.getAllDoctors(req.query);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Doctors fetched successfully!",
        data: result,
    });
});

const getById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await DoctorService.getById(id as string);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Doctor fetched successfully!",
        data: result,
    });
});

const updateDoctor = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await DoctorService.updateDoctor(id as string, req.body);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Doctor profile updated successfully!",
        data: result,
    });
});

const deleteDoctor = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await DoctorService.deleteDoctor(id as string);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Doctor deleted successfully!",
        data: result,
    });
});

export const DoctorController = {
    getAllDoctors,
    getById,
    updateDoctor,
    deleteDoctor
};
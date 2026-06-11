import { Request, Response } from 'express';
import status from 'http-status';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { SpecialtyService } from './specialty.service';

const createSpecialty = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.createSpecialty(req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Specialty created successfully',
    data: result,
  });
});

const getAllSpecialties = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.getAllSpecialties(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Specialties fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getSpecialtyById = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.getSpecialtyById(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Specialty fetched successfully',
    data: result,
  });
});

const updateSpecialty = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.updateSpecialty(req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Specialty updated successfully',
    data: result,
  });
});

const deleteSpecialty = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.deleteSpecialty(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const SpecialtyController = {
  createSpecialty,
  getAllSpecialties,
  getSpecialtyById,
  updateSpecialty,
  deleteSpecialty,
};

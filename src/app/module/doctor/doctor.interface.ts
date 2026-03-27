export type IDoctorFilterRequest = {
    searchTerm?: string | undefined;
    email?: string | undefined;
    contactNumber?: string | undefined;
    gender?: string | undefined;
    specialties?: string | undefined;
    designation?: string | undefined;
};

export type IDoctorUpdateData = {
    name?: string;
    profilePhoto?: string;
    contactNumber?: string;
    address?: string;
    registrationNumber?: string;
    experience?: number;
    gender?: 'MALE' | 'FEMALE';
    appointmentFee?: number;
    qualification?: string;
    currentWorkPlace?: string;
    designation?: string;
    specialties?: string[];
};
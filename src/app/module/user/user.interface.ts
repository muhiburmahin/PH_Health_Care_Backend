export interface ICreateDoctorPayload {
    password: string;
    doctor: {
        name: string;
        email: string;
        profilePhoto?: string;
        contactNumber?: string;
        address?: string;
        registrationNumber: string;
        experience?: number;
        gender: 'MALE' | 'FEMALE';
        appointmentFee: number;
        qualification: string;
        designation: string;
        currentWorkPlace: string;
    }
    specialties: string[];
}






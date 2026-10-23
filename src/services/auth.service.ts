import type { RegisterInput, LoginInput} from '../validation/user.schema.js'
import { User } from '../models/user.model.js'; 
import ApiError from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import bcrypt from 'bcryptjs';


export async function registerUser(input: RegisterInput) {
    const { email, name, password } = input;

    const existingUser = await User.findOne({email});
    if (existingUser){
        throw ApiError.conflict('EMAIL_TAKEN','A user already exists with this email');
    }

    const user = await User.create({ 
        name, 
        email, 
        passwordHash: password,
        role: 'student'
    });

    const token = jwt.sign(
        { sub: user.id, role: user.role },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn as NonNullable<jwt.SignOptions['expiresIn']> },
    );

    return { 
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        },
        token,
    };
}

export async function loginUser(input: LoginInput) {
    const { email, password } = input;

    const user =  await User.findOne({email}, 'passwordHash name email role');
    if(!user){
        throw ApiError.unAuthorized('UNAUTHORIZED', 'User does not exist.')
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch){
        throw ApiError.unAuthorized('UNAUTHORIZED', 'Incorrect Password.')
    }

    const token = jwt.sign(
        { sub: user.id, role: user.role },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn as NonNullable<jwt.SignOptions['expiresIn']> },
    );


    return { 
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        },
        token,
    };
}
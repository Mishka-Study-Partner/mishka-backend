const { z } = require("zod");

const registerSchema = z
  .object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email().max(150),
    password: z.string().min(6).max(255).optional(),
    agreeTerms: z.boolean(),
    phoneNumber: z.string().max(20).optional(),
    countryCode: z.string().max(5).optional(),
    provider: z.string().max(20).optional(),
    providerId: z.string().max(100).optional(),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().max(20).optional(),
    countryCode: z.string().max(5).optional(),
    password: z.string().min(6).max(255),
  })
  .strict()
  .refine((v) => Boolean(v.email || v.phoneNumber), {
    message: "Either email or phoneNumber is required",
    path: ["email"],
  });

const forgotPasswordSchema = z
  .object({
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().max(20).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.email || v.phoneNumber), {
    message: "Either email or phoneNumber is required",
    path: ["email"],
  });

const resetPasswordSchema = z
  .object({
    userId: z.string().uuid(),
    resetCode: z.string().min(4).max(10),
    newPassword: z.string().min(6).max(255),
  })
  .strict();

const updateUserSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    fullName: z.string().max(150).optional(),
    username: z.string().max(50).optional(),
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().max(20).optional(),
    countryCode: z.string().max(5).optional(),
    rememberMe: z.boolean().optional(),
    agreeTerms: z.boolean().optional(),
    provider: z.string().max(20).optional(),
    providerId: z.string().max(100).optional(),
    role: z.enum(["student", "teacher", "admin"]).optional(),
    isVerified: z.boolean().optional(),
    profileImageUrl: z.string().max(2048).optional(),
    gender: z.string().max(20).optional(),
    password: z.string().min(6).max(255).nullable().optional(),
  })
  .strict();

const aiChatSchema = z
  .object({
    session_id: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

const aiGenerateToolsSchema = z
  .object({
    session_id: z.string().min(1),
    tool_type: z.enum(["quizzes", "flashcards", "mind_maps", "summary", "chat"]),
    complexity: z.string().min(1),
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateUserSchema,
  aiChatSchema,
  aiGenerateToolsSchema,
};

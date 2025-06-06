import { z, ZodIssue } from "zod";

export const metadataBaseSchema = z.object({
        name: z.string(),
        type: z.enum(["openResponse", "multipleChoice", "noResponse", "listSorter"]),
        notes: z.string().optional(),
        rows: z.number().optional(),
        shuffleOptions: z.boolean().optional(),
        select: z.string().optional(),
    });

export const metadataSchema = (fileName: string) =>
    metadataBaseSchema.superRefine((data, ctx) => {
        if (data.name !== fileName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `name must match file path starting from repository root`,
                path : ["name"],
            });
        }
    });

export type MetadataType = z.infer<typeof metadataBaseSchema>;

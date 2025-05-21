import { z, ZodIssue } from "zod";

const seperatorSchema = z.string().regex(/^-{3,}$/);

export const metadataSchema = (fileName) =>
    z.object({
        name: z.string(),
        type: z.enum(["openResponse", "multipleChoice", "noResponse", "listSorter"]),
    }).superRefine((data, ctx) => {
        if (data.name !== fileName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `name must match file path starting from repository root`,

            });
        }
    });


//filename is address of string
const nameSchema = (fileName) => z.string().superRefine((val, ctx) => {
    const expected = `name: ${fileName}`;
    if (val !== expected) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Line identifying name must be of form "name: ${fileName}"`,
        });
    }
});

const typeSchema = z.enum(["openResponse", "multipleChoice", "noResponse", "listSorter"]);

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createNote = mutation({
    args: {
        title: v.string(),
        content: v.string(),
        summarizedText: v.string(),
        isSummarized: v.boolean(),
    },
    handler: async (ctx, args) => {
        const note = await ctx.db.insert("notes", args);
        // Create a new note item in the database
    },
})

export const getNotes = query({
    args: {},
    handler: async (ctx) => {
        const notes = await ctx.db.query("notes").collect();
        return notes;
    },
});

export const deleteNote = mutation({
    args: {
        id: v.id("notes"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});



export const updateNote = mutation({
    args: {
        id: v.id("notes"),
        title: v.string(),
        content: v.string(),
        summarizedText: v.string(),
        isSummarized: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { title: args.title, content: args.content, summarizedText: args.summarizedText, isSummarized: args.isSummarized });
    },
})
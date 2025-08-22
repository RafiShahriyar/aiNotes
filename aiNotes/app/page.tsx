"use client";
import React, { useEffect, useState,useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown, Pencil, Share2, Star, Trash2, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea"
import { Id } from "@/convex/_generated/dataModel";






export default function Home() {

  interface NoteType {
  _id: string;
  title: string;
  content: string;
  summarizedText: string;
}


  const createNote = useMutation(api.notes.createNote);
  const getNotes = useQuery(api.notes.getNotes);
  const deleteNote = useMutation(api.notes.deleteNote);
  const updateNote = useMutation(api.notes.updateNote);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [summarizedText, setSummarizedText] = useState("");
  const [isSummarized, setIsSummarized] = useState(false);
  const addedNotesChroma = useRef<Set<string>>(new Set());
  const [relatedNotesTab, setRelatedNotesTab] = useState<boolean>(false);
  const notesRef = useRef<HTMLDivElement | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<NoteType[]>([]);
  const [editingNote, setEditingNote] = useState<{ 
      _id: Id<"notes">; 
      title: string; 
      content: string; 
      summarizedText: string;
    } | null>(null);

  const [expandedNote, setExpandedNote] = useState<{ 
      _id: Id<"notes">; 
      title: string; 
      content: string; 
      summarizedText: string;
  } | null>(null);
  const [summaryTab, setSummaryTab] = useState<Id<"notes"> | null>(null);

  useEffect(() => {
    const sendNotesToChroma = async () => {
      if (!getNotes) return;

      for (const note of getNotes) {
        const noteId = note._id.toString();

        if (addedNotesChroma.current.has(noteId)) continue;

        try {
          await fetch("http://localhost:8000/add_note", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: noteId,
              title: note.title,
              content: note.content,
              summarizedText: note.summarizedText,
            }),
          });

          addedNotesChroma.current.add(noteId);
        } catch (err) {
          console.error("Failed to send note to Chroma:", err);
        }
      }
    };

    sendNotesToChroma();
  }, [getNotes, deleteNote]);

  const handleSubmit = async () => {
  
    console.log("Form submitted ✅");
    await createNote({ content, title, summarizedText, isSummarized });
    setContent("");
    setTitle("");
    setSummarizedText("");
    setIsSummarized(false);
  };

  const handleEditSubmit = async () => {
    if (editingNote === null) return;

    await updateNote({
      id: editingNote._id,
      title: editingNote.title,
      content: editingNote.content, 
      summarizedText: editingNote.summarizedText,
      isSummarized: false, // Assuming you want to reset this on edit
    });

    try {
      const res = await fetch(`http://localhost:8000/update_note/${editingNote._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingNote._id.toString(),
          title: editingNote.title,
          content: editingNote.content,
          summarizedText: editingNote.summarizedText,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update note");
      }

      const data = await res.json();
      console.log("Updated:", data);

    } catch (err) {
    }


    setContent("");
    setTitle("");
    setEditingNote(null);
  };

  const handleDeleteNote = async (id: Id<"notes">) => {
    await deleteNote({ id });
    const noteId = id.toString();
    try {
      const res = await fetch(`http://localhost:8000/delete_note/${noteId}`, {
        method: "DELETE",
      });
  
      if (!res.ok) {
        throw new Error("Failed to delete note");
      }
  
      const data = await res.json();
      console.log("Deleted:", data);
  
    } catch (err) {
      console.error(err);
    }
  };


  const handleReadMore = async (note: { _id: Id<"notes">; content: string; title: string; summarizedText: string }) => {
    setExpandedNote(note);
  };

  const handleRelatedNotes = async (note: { _id: Id<"notes">; content: string; title: string; summarizedText: string }) => {
    setRelatedNotesTab(true);
    try {
      const res = await fetch("http://localhost:8000/query_related?top_k=3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id: note._id.toString(),
            title: note.title,
            content: note.content,
            summarizedText: note.summarizedText,
          }),
      });

      const data: Array<{ _id: string; title: string; content: string; summarizedText: string }> = await res.json();
      console.log("Related notes:", data);

      const convertedNotes = data.map((n) => ({
        ...n,
        _id: n._id as Id<"notes">, 
      }));

      setRelatedNotes(convertedNotes); // <-- store in state
      console.log("Related notes set in state:", relatedNotes);
    } catch (err) {
      console.error("Error fetching related notes:", err);
    }
  };

  const handleSummarize = async (note: { _id: Id<"notes">; content: string; title: string; isSummarized: boolean }) => {
    setSummaryTab(note._id);
    if (note.isSummarized) {
      console.log("Note already summarized");
      return;
    }
    const response = await fetch("/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: note.content })
    });

    const data = await response.json();
    console.log(data);
    const summaryText = data[0]?.summary_text || "";

    setSummarizedText(summaryText);
    
    updateNote({
      id: note._id,
      title: note.title,
      content: note.content,
      summarizedText: summaryText,
      isSummarized: true,
    });
    console.log("Note summarized successfully", summaryText);

  };

  const scrollToNotes = () => {
    notesRef.current?.scrollIntoView({ behavior: "smooth" });
  };


  return (
    <>
    {/* landing page*/}
      <div className="relative w-screen h-screen">
        <div>
          <Image
            src="/8422166.jpg"
            alt="Ai Note Summarizer"
            fill     // ✅ makes it auto-fill container
            className="object-cover rounded-lg brightness-40"
          />
        </div>

        <div className="absolute inset-0 ">
          <div className="text-center flex justify-center items-center flex-col h-full p-4 text-white">
            <h1 className="text-4xl font-bold">Welcome to Ai Note Summarizer online</h1>
            <p className="mt-4 text-2xl text-gray-400">Create and manage your notes effortlessly.</p>
            <p className="mt-8 text-1xl mx-auto w-full md:w-1/4">Lorem Ipsum is-lease of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem</p>
            <div className="flex gap-4 mt-10">
              <button onClick={scrollToNotes} style={{cursor: 'pointer'}} className="bg-transparent border border-gray-500 text-white p-3 rounded-md mr-2 hover:bg-gray-500">Get Started</button>
              <button style={{cursor: 'pointer'}} className="bg-transparent border border-gray-500 text-white p-3 rounded-md ml-2 hover:bg-gray-500">Learn More</button>
            </div>
          </div>
        </div>
      </div>

      {/* add notes Dialog*/}

      <Dialog>
        <DialogTrigger asChild>
          <button 
            className="fixed bottom-4 right-4 bg-white text-black
                      w-12 h-12 rounded-full text-3xl
                      flex items-center justify-center 
                      shadow-lg hover:bg-gray-600 hover:text-white"
            style={{ cursor: "pointer" }}
          >
            +
          </button>
        </DialogTrigger>
        <form >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add a New Note</DialogTitle>
              <DialogDescription>
                Enter your note content below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="title-1">Title</Label>
                <Input id="title-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter note title" />
              </div>
              <div className="grid gap-3">
                <div className="grid w-full gap-3">
                  <Label htmlFor="content">Your Note</Label>
                  <Textarea placeholder="Type your content here." id="content" value={content} onChange={(e) => setContent(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={() => handleSubmit()}>Save changes</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>

      {/* Edit Note Dialog */}
      {(editingNote !== null) && (
      <Dialog  open={true} onOpenChange={() => setEditingNote(null)}>
        <form >
        <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                Update your note content below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="title-1">Edit Title</Label>
                <Input id="title-1" value={editingNote.title} onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })} placeholder="Enter note title" />
              </div>
              <div className="grid gap-3">
                <div className="grid w-full gap-3">
                  <Label htmlFor="content">Edit Your Note</Label>
                  <Textarea placeholder="Type your content here." id="content" value={editingNote.content} onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={() => handleEditSubmit()}>Save changes</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
      )}

   

      {/* Display Notes */}
      <div ref={notesRef} className="w-3/4 mx-auto mt-15">
        <div><h1 className="text-center text-4xl font-bold text-white pb-12">My Notes</h1></div>
        <div className="grid grid-cols-12 grid-flow-dense gap-6">
          {getNotes?.map((note) => (
            <div
              key={note._id}
              className="group relative bg-zinc-900 col-span-6 md:col-span-3 rounded-md shadow-sm hover:transform hover:scale-102 duration-200 flex flex-col overflow-hidden"
            >

              {/* Hover icons on the left */}
              <div className="absolute bottom-4 right-4 flex flex-row gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button style={{cursor: 'pointer'}} className="text-white hover:text-blue-400" onClick={() => setEditingNote(note)}>
                  <Pencil size={18} />
                </button>
                <button style={{cursor: 'pointer'}} className="text-white hover:text-red-400" onClick={() => handleDeleteNote(note._id) } >
                  <Trash2 size={18} />
                </button>
                <button style={{cursor: 'pointer'}} className="text-white hover:text-yellow-400">
                  <Star size={18} />
                </button>
                <button style={{cursor: 'pointer'}} className="text-white hover:text-green-400" onClick={() => handleSummarize(note)}>
                  <Share2 size={18} />
                </button>
                {summaryTab === note._id && (
                  <button style={{cursor: 'pointer'}} className="text-white hover:text-red-400" onClick={() => setSummaryTab(null)}>
                    <X size={18} />
                  </button>
                )}
              </div>

              {summaryTab === note._id ? (
                <div className="p-4 pb-12 mt-2 flex-col h-full">
                  <h2 className="text-xl font-semibold text-white mb-5">Summary</h2>
                  <p className="text-gray-300 break-words md:text-base line-clamp-3 md:line-clamp-5 text-xs  ">{note.summarizedText}</p>
                  <button 
                    className="mt-auto text-gray-400 hover:text-white pt-4"
                    onClick={() => setExpandedNote(note)}
                    style={{cursor: 'pointer'}}
                    >
                    Read more
                  </button>
                </div>

              ) :

              // {/* Card content */}
              (<div className="p-4 pb-12 mt-2 flex-col h-full">
                <h2 className="text-xm md:text-xl font-semibold text-white mb-5">{note.title}</h2>
                <p className="text-gray-300 break-words md:text-base line-clamp-3 md:line-clamp-5 text-xs  ">{note.content}</p>
                <button 
                  className="mt-auto text-gray-400 hover:text-white pt-4"
                  onClick={() => handleReadMore(note)}
                  style={{cursor: 'pointer'}}
                >
                   Read more
                </button>
              </div>)}

              {expandedNote && (
              <>
              <Dialog open={!!expandedNote} onOpenChange={() => setExpandedNote(null)} >
                <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-zinc-800  ">
                  <DialogHeader>
                    <DialogTitle className="text-white">{expandedNote.title}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <p className="text-gray-300 whitespace-pre-line">
                      {summaryTab === expandedNote._id ? expandedNote.summarizedText : expandedNote.content}
                    </p>
                    <button 
                      className="mt-auto text-gray-400 hover:text-white pt-4"
                      onClick={() => handleRelatedNotes(expandedNote)}
                      style={{cursor: 'pointer'}}
                    >
                      Related Notes
                    </button>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" style={{cursor: 'pointer'}}>Close</Button>
                    </DialogClose>
                  </DialogFooter>
                    {/* <div className="flex"><Button variant="outline" onClick={() => handleRelatedNotes(expandedNote)} >Related Notes</Button></div> */}
                </DialogContent>
              </Dialog>

              <Drawer open={relatedNotesTab} onOpenChange={() => setRelatedNotesTab(false)}>

                <DrawerContent className="bg-zinc-900">
                  <div className="mx-auto  w-3/4">
                    <DrawerHeader>
                      <DrawerTitle className="text-white font-semibold text-lg">Related Notes</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-0">
                      <div className="grid grid-cols-12 gap-4 grid-flow-dense">
                        {relatedNotes.map((note) => (
                          <div key={note._id} className="border border-zinc-700 col-span-6 md:col-span-4 bg-zinc-700 p-2 rounded-md hover:transform hover:scale-102 duration-200 hover:border-white" style={{ cursor: 'pointer' }}>
                              <div
                                onClick={() => {
                                  setExpandedNote({
                                    ...note,
                                    _id: note._id as Id<"notes">,
                                  });
                                  setRelatedNotesTab(false); // <-- closes the drawer
                                }}
                              >
                                <h1 className='line-clamp-2 text-white p-4 text-sm md:text-base'>{note.title}</h1>
                                <p className='line-clamp-3 text-gray-300 p-4 mb-5 text-xs md:text-sm'>{note.content}</p>
                              </div>
                          </div>
                        ))}
                        {/* <div className="col-span-4 bg-amber-500 p-2">
                          <h1 className='line-clamp-2'>I like that Kevin doesn’t get all petty during these, I’ve seen just about everyone else threaten to pull the deal away and start counting down from 5 but he knows that’s not how you make trusting business partners. When you rush people in big business decisions they tend to feel ripped off.</h1>
                        </div>
                        <div className="col-span-4 bg-amber-500 p-2">
                        </div>
                        <div className="col-span-4 bg-amber-500 p-2">
                        </div> */}
                      </div>
                      <div className="mt-3">
                      </div>
                    </div>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <button
                          className="bg-zinc-700 text-white py-2 px-4 rounded-md mb-5
                           hover:bg-gray-200 hover:text-gray-900"
                           style={{cursor: 'pointer'}}
                          >
                            Cancel
                          </button>
                      </DrawerClose>
                    </DrawerFooter>
                  </div>
                </DrawerContent>
              </Drawer>
              </>
            )}
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div className="bg-zinc-900 text-white py-10 mt-15">
        <div className="container mx-auto text-center">
          <p>&copy; 2023 Ai Note Summarizer. All rights reserved.</p>
        </div>
      </div>


    </>
  );
}



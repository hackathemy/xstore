"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import React from "react";
import { usePrivy } from "@privy-io/react-auth";

const formSchema = z.object({
  name: z.string().default("").optional(),
  menu: z.string().optional(),
  price: z.coerce.number().optional(),
  image: z.string().optional(),
  description: z.string().default("").optional(),
  owner: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const MakeStore: React.FC = () => {
  const { user } = usePrivy();
  const address = user?.wallet?.address;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      owner: address,
      name: "Phed Mark",
      menu: "Phed",
      description:
        "Phed Mark - Easily one of the most popular and loved dishes throughout Thailand.",
      price: 10,
      image:
        "https://lh5.googleusercontent.com/p/AF1QipP4dsFswNUlKJayzgH8xVVzDlp03p038KKjIJ8w=w203-h135-k-no",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      const formData = {
        ...data,
        price: String(data.price),
        owner: address,
      };

      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create store");
      }

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      console.error("Error creating store:", error);
      alert("Failed to create store. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-5"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Store Name</FormLabel>
              <FormControl>
                <Input
                  disabled={loading}
                  placeholder="Enter store name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="menu"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Featured Menu</FormLabel>
              <FormControl>
                <Input
                  disabled={loading}
                  placeholder="Main menu item"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Description</FormLabel>
              <FormControl>
                <Input
                  disabled={loading}
                  placeholder="Describe your store"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Image URL</FormLabel>
              <FormControl>
                <Input
                  disabled={loading}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Price (MOVE)</FormLabel>
              <FormControl>
                <Input
                  disabled={loading}
                  placeholder="0.00"
                  type="number"
                  step="0.0001"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="owner"
          render={() => (
            <FormItem>
              <FormLabel className="text-gray-300">Owner Wallet</FormLabel>
              <FormControl>
                <div className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-400 truncate">
                  {address || "Connect wallet to continue"}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          disabled={loading || !address}
          type="submit"
          className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-semibold mt-2"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating...
            </div>
          ) : (
            "Create Store"
          )}
        </Button>
        {!address && (
          <p className="text-xs text-yellow-400 text-center">
            Connect wallet to create a store
          </p>
        )}
      </form>
    </Form>
  );
};

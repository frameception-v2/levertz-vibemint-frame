"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { PROJECT_TITLE, MEMES, SAVE_PRICE } from "~/lib/constants";

function MemeCard({ memeUrl, onSave, onMint, isSaved }: { 
  memeUrl: string;
  onSave: () => void;
  onMint: () => void;
  isSaved: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🔥 Fresh Vibe Check 🔥</CardTitle>
        <CardDescription>
          {isSaved ? "Your saved vibe" : "New vibe unlocked!"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <img 
          src={memeUrl} 
          alt="High vibe meme"
          className="w-full h-48 object-cover rounded-lg"
        />
        <div className="flex gap-2">
          <Button 
            onClick={onSave}
            disabled={isSaved}
          >
            {isSaved ? "Vibe Saved" : `Save Vibe (${SAVE_PRICE} ETH)`}
          </Button>
          <Button variant="secondary" onClick={onMint}>
            Mint as NFT
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const { data: session } = useSession();
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [currentMeme, setCurrentMeme] = useState("");
  const [savedMeme, setSavedMeme] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const getRandomMeme = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * MEMES.length);
    return MEMES[randomIndex];
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await sdk.actions.sendTransaction({
        chainId: `eip155:${optimism.id}`,
        method: "eth_sendTransaction",
        params: {
          to: "0x...", // Your wallet address
          value: SAVE_PRICE.toString(), // Convert to wei
        },
      });
      setSavedMeme(currentMeme);
      setIsSaved(true);
    } catch (error) {
      console.error("Save failed:", error);
    }
  }, [currentMeme, getRandomMeme]);

  const handleMint = useCallback(async () => {
    try {
      await sdk.actions.sendTransaction({
        chainId: `eip155:${base.id}`,
        method: "eth_sendTransaction", 
        params: {
          to: "0x...", // Your NFT contract address
          data: "0x...", // Mint transaction data
        },
      });
    } catch (error) {
      console.error("Mint failed:", error);
    }
  }, [currentMeme]);

  useEffect(() => {
    if (context?.client.added) {
      setCurrentMeme(savedMeme || getRandomMeme());
    }
  }, [context, savedMeme, getRandomMeme]);

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <MemeCard 
          memeUrl={currentMeme}
          onSave={handleSave}
          onMint={handleMint}
          isSaved={isSaved}
        />
      </div>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BasicTest() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-4">Basic Test Page</h1>
          <p className="mb-4">If you can see this page, the application is loading correctly.</p>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button onClick={() => setCount(count - 1)}>-</Button>
            <span className="text-xl font-bold">{count}</span>
            <Button onClick={() => setCount(count + 1)}>+</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/whywhy/ui/card";
import { TreePine } from "lucide-react";

const EmptyTreeState: React.FC = () => (
  <Card className="border-dashed border-2 border-gray-300 h-full flex items-center justify-center">
    <CardContent className="text-center text-gray-500">
      <TreePine className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="font-semibold">分析ツリーはまだありません</p>
      <p className="text-sm mt-1">AIとの対話を開始すると、ここにツリーが生成されます。</p>
    </CardContent>
  </Card>
);

export default EmptyTreeState;

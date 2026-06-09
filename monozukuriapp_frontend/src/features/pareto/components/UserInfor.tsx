import { Label } from "@radix-ui/react-label";
import { DatePickerWithRange } from "@/components/DatePickerWithRange";
import { Spacer } from "@/components/Spacer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserInfo } from "@/features/pareto/hooks";
import React, { useState } from "react";
import { memo } from "react";

const UserInfoPareto = ({
  totalQuantity,
  handleFormChange,
}: {
  totalQuantity: number;
  handleFormChange: () => void;
}) => {
  const [user, setUser] = useState<string>("");
  const { formattedDate, handlePeriodChange, handleSaveUserInfo } = useUserInfo({
    totalQuantity: totalQuantity,
    userName: user,
  });

  return (
    <div className="overflow-hidden">
      <Label className="font-bold">ユーザー情報</Label>
      <Spacer
        size={4}
        type="vertical"
      />
      <div className="flex items-center mt-4">
        <Label>期間:</Label>
        <Spacer
          size={4}
          type="horizontal"
        />
        <DatePickerWithRange
          onDateChange={handlePeriodChange}
          className="m-1"
          handleFormChange={handleFormChange}
        />
      </div>
      <Spacer
        size={3}
        type="vertical"
      />
      <div className="flex items-center mt-2">
        <Label>氏名:</Label>
        <Spacer
          size={4}
          type="horizontal"
        />
        <Input
          className="w-[222.74px]"
          placeholder="氏名"
          type="text"
          onChange={(e: any) => {
            setUser(e.target.value);
            handleFormChange();
          }}
        />
      </div>
      <Spacer
        size={4}
        type="vertical"
      />
      <div className="flex items-center mt-2">
        <Label>合計:</Label>
        <Spacer
          size={3}
          type="horizontal"
        />
        <Label className="m-1">{totalQuantity}</Label>
      </div>
      <Spacer
        size={4}
        type="vertical"
      />
      <div className="flex items-center mt-2">
        <Label>作成日:</Label>
        <Spacer
          size={3}
          type="horizontal"
        />
        <Label className="m-1">{formattedDate}</Label>
      </div>
      <Spacer
        size={4}
        type="vertical"
      />
      <Button
        className="bg-blue-500 text-white mt-4 focus:outline-none"
        onClick={() => {
          handleSaveUserInfo();
        }}
        variant="ghost"
      >
        作成者情報を保存
      </Button>
    </div>
  );
};

export default memo(UserInfoPareto);

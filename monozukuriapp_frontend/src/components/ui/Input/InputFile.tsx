import React, { useState } from "react";

type Props = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  accept: string;
  text?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  previewUrl: string | null;
};

const InputFile: React.FC<Props> = ({ accept, text, onChange, previewUrl, setPreviewUrl, ...props }) => {
  const [name, setName] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const file = files[0];
      setName(file.name);
      setPreviewUrl(URL.createObjectURL(file));

      if (onChange) {
        onChange(event);
      }
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0 && inputRef.current) {
      const file = files[0];
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      inputRef.current.files = dataTransfer.files;

      setName(file.name);
      setPreviewUrl(URL.createObjectURL(file));

      if (onChange) {
        const changeEvent = new Event("change", { bubbles: true }) as any;
        const inputEvent = new Event("input", { bubbles: true }) as any;
        Object.defineProperty(inputEvent, "target", { value: inputRef.current, writable: false });
        onChange(inputEvent);
      }
    }
  };

  return (
    <div
      {...props}
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer p-4 border-2 border-dashed rounded-lg flex flex-col items-center  ${previewUrl ? "h-60" : ""} w-full`}
    >
      {previewUrl ? (
        <div className="flex flex-col items-center">
          <img
            src={previewUrl}
            alt="Preview"
            className="object-cover max-h-48 mb-2"
          />
          {/* {name && <p className="text-sm text-gray-600 ">{name}</p>} */}
        </div>
      ) : (
        <p className="text-sm text-gray-500"> {name || text}</p>
      )}
      <input
        type="file"
        className="opacity-0 invisible inset-0 cursor-pointer w-0 h-0"
        accept={accept}
        ref={inputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default InputFile;

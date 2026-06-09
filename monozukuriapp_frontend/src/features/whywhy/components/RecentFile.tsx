import { Thread } from "@/interfaces/thread";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { Tooltip, Typography } from "@mui/material";
import { differenceInDays, parseISO } from "date-fns";
import { FileText } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RecentFile = () => {
  const [dataRecentFile, setDataRecentFile] = useState<Thread[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentFiles = async () => {
      try {
        const response = await whyWhyApiClient.getThreads(1, 12);
        console.log("Recent files response:", response.data.data.data);
        setDataRecentFile(response.data.data.data || []);
      } catch (error) {
        console.log("Error fetching recent files:", error);
      }
    };

    fetchRecentFiles();
  }, []);

  return (
    <>
      {dataRecentFile.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-medium text-gray-900 mb-4">最近のファイル</h2>
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
            {dataRecentFile.map((file, index) => {
              const updatedAt = file?.updated_at ? parseISO(file.updated_at) : null;

              const daysAgo = updatedAt ? differenceInDays(new Date(), updatedAt) : "N/A";

              return (
                <div
                  key={index}
                  className="p-3 flex items-center gap-2 justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (file.children_count > 0) {
                      navigate(`/whywhy/children/${file.thread_id}`);
                    } else {
                      navigate(`/whywhy/view/${file.thread_id}`);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-3" />
                    <Tooltip
                      title={file?.problem.title}
                      arrow
                    >
                      <Typography
                        variant="subtitle1"
                        className="line-clamp-1 break-all flex-1"
                      >
                        {file?.problem.title}
                      </Typography>
                    </Tooltip>
                  </div>
                  <span className="text-sm text-gray-500 text-nowrap">{`Modified ${daysAgo} days ago`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default RecentFile;

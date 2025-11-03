import React from "react";
import { Card, CardHeader, CardTitle } from "./card";

export default function CardTest() {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          Test Card Title
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
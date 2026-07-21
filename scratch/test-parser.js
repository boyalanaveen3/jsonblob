const { parseInput, inferEntityNameFromJson } = require("../lib/ai/generators/api-generator/parser");

const userAnalyticsJson = {
  "status": 1000,
  "message": "success",
  "data": {
    "services": {
      "Telemedicine": {
        "search": 2470,
        "booked": 190,
        "revenue": 702
      }
    }
  }
};

const userSwaggerJson = {
  "swagger": "2.0",
  "info": {
    "title": "Sample API",
    "version": "1.0.0"
  },
  "paths": {
    "/api/employees": {
      "get": {
        "summary": "Retrieve employees"
      }
    }
  }
};

console.log("Current inferEntityNameFromJson (Analytics JSON):", inferEntityNameFromJson(userAnalyticsJson, userAnalyticsJson));
console.log("Current parseInput (Swagger as JSON):", parseInput("json", JSON.stringify(userSwaggerJson)));
console.log("Current parseInput (Swagger as OpenAPI):", parseInput("openapi", JSON.stringify(userSwaggerJson)));

# Introduction

This project implements naming service for the GS1 identifier in accordance with the GS1 EPCGlobal ONS 2.0.1 standard, and provides APIs for managing NAPTR records for each project in the KI.

# API Description

All APIs use the HTTP GET protocol and register the currently assigned api_key. The list of APIs is the same as the following.

- show_naptr_record
| api_key  | api_key	API KEY (mandatory) |
| ------------- | ------------------------------------------- |
| project  | Target project for record management (mandatory)  |
| idtype  | GS1 Identifier ex) gtin, gln, sscc, grai, giai, gsrn, gdti, ginc, gsin, gcn, cpid, * |
| start | Start index of the record to query |
| count | Number of records to query |
| ------------- | ------------------------------------------- |
| ------------- | ------------------------------------------- |
| ------------- | ------------------------------------------- |
| ------------- | ------------------------------------------- |
| ------------- | ------------------------------------------- |
| ------------- | ------------------------------------------- |
| ------------- | ------------------------------------------- |
| ------------- | ------------------------------------------- |

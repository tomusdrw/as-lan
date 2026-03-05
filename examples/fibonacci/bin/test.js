#!/usr/bin/env node

import { setMemory } from "imports";
import { memory, runAllTests } from "../build/test.js";

setMemory(memory);
runAllTests();

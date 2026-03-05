#!/usr/bin/env node

import { memory, runAllTests } from "../build/test.js";
import { setMemory } from "imports";

setMemory(memory);
runAllTests();

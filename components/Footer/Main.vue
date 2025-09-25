<template>
    <footer class="w-full pl-32 pr-32 bg-red-900 border-t">
      <div class="grid items-center grid-cols-3 pt-8 pb-8 mx-auto border-b-2 border-gray-500">
        <!-- Left Section: VSU Logo -->
        <div class="relative flex items-center justify-start ">
          <!-- VSU Brand Logo -->
           <div class="absolute z-10 left-32">
            <a href="https://www.vsu.edu.ph/" class="cursor-pointer">
              <img src="/vsu_logo_white.png" alt="Visayas State University Logo" class=" size-64" />
            </a>
           </div>
        </div>
  
        <!-- Center Section: CET Logo -->
        <div class="flex justify-center">
          <img
            src="/FE_logo_wbg.png"
            alt="Faculty of Engineering Logo"
            class="w-auto h-24"
          />
        </div>
  
        <!-- Right Section: Vision and Mission -->
        <div class="pl-4 space-y-2 font-sans text-xs font-medium text-justify text-white border-l-2 border-gray-500">
          <p>
            <span class="text-sm font-bold text-yellow-400">Vision:</span> A globally competitive university for science,
            technology, and environmental conservation.
          </p>
          <p>
            <span class="text-sm font-bold text-yellow-400">Mission:</span> Development of a highly competitive human
            resource, cutting-edge scientific knowledge, and innovative technologies for sustainable
            communities and environment.
          </p>
        </div>
      </div>
      <div class="flex flex-row items-center justify-center pt-4 pb-4 space-x-2 text-xs text-white"> 
        <span class="font-bold">© 2025</span>
        <span>Visayas State University - Faculty of Engineering.</span>
        <span>All rights reserved.</span>
      </div>
    </footer>
  </template>
  
  <style scoped>
    /* *{
      outline: red solid 1px;
    } */
  </style>
  
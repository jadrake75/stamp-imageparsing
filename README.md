# Stamp Image Parsing Application

## Concept Art

The following is a sketch created for the concept art for the project

![Concept Sketch](https://github.com/jadrake75/stamp-imageparsing/raw/master/assets/sketches/image-bursting-sketch.png)

## Progress Videos

Here is a short video showing the application in action (Note the window frame and dialogs are not visible due to the reocrding software):
[BETA Video](http://www.drakeserver.com/javaws/videos/BETA%20-%20Stamp%20Image%20Bursting%20Application.mp4)

## Pre-Requisites

Due to the complex environment, the pre-requisites to build are extensive.  

- Java 1.8 or higher using the 64-bit JVM
- NodeJS 8.x or higher
- Aurelia CLI (install with "npm install -g aurelia-cli")
- Ant 1.8+
- Maven 3.x+
- Install Microsoft Build Tools as Administrator 
  - `npm install --global --production windows-build-tools`
  - Need to build node-java and other node-gyp modules
  - This install will take a while to execute
  - `npm config set msvs_version 2013 --global` to force it to use version 2.0
- Download [mavent-ant-tasks.jar](http://archive.apache.org/dist/maven/ant-tasks/2.1.3/binaries/maven-ant-tasks-2.1.3.jar) and copy this to a common folder (eg. c:\ant-tasks)
- create a file in the ${user.home} called "stampdev.properties"
  - Define the property "user.lib" and set this to where ant libraries are located
  - If using '\' make sure to double them '\\\\' or use '/'


## Build/Run

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

Ensure you have followed the pre-requisites

```bash
# Clone this repository
git clone https://github.com/jadrake75/stamp-imageparsing.git
# Go into the repository
cd stamp-imageparsing
# Install dependencies
npm install
# Build Aurelia app (client JavaScript application)
npm run build
# Build the Java Processor
ant jar
# Run the app
npm start
```

## Executing Unit Tests

To execute the tests run the following
```bash
au test
```

You can add the ``--watch`` flag if you want to keep the tests harness running and watch for code changes.  This currently only tests the client application code.

## Create Windows Installer

Assuming you have been able to Build/Run the app, you can create and installer with

```bash
npm start win32
```

This will create an installer in release-builds called "stamp-imageparsing-install.exe"


## License

[Apache 2.0](LICENSE)

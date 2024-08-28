## Overview

The idea involves displaying a Tree View within VS Code, presenting a comprehensive list of Libraries, specifically LF programs comprising multiple reactors, facilitating their seamless integration into our individual LF Programs. These libraries can originate from two sources: those crafted by the programmer within their local workspace (Local Libraries), and those downloaded using Lingo Package Manager (Lingo Libraries).

## Tree View Composition

The Tree View is organized within a view container named the 'Lingua Franca Package Explorer,' featuring two distinct sections:

1. **Local Libraries**: This section showcases a catalog of Local Libraries, which are libraries personally defined by the programmer.
2. **Lingo Libraries**: Here, you'll find a catalog of all libraries downloaded in the personal workspace using the Lingo package manager.

## Local Libraries View

The Local Libraries view exclusively presents a listing of LF programs defined by the user and positioned within the designated path. After creating a LF Project, developers can incorporate LF Programs, akin to libraries of reactors, into a folder located at `{project_name}/src/lib/.` The Local Libraries view will then enumerate all LF Programs within this directory, typically represented by the pattern `/{project_name}/src/lib/*.lf` (check the [RFC](https://github.com/lf-lang/rfcs/blob/main/rfcs/0011-reusable-reactors-folder.md) for the proposed LF project structure, including the libraries).

The view's hierarchy is structured as follows:

```
├── LF Project
│   ├── LF Program 1
│   │   ├── Reactor 1
│   │   └── Reactor 2
│   ├── LF Program 2
│   │   ├── Reactor 1
└── └── └── Reactor 2
```

The image below illustrates the Local view. In this depiction, the "root folder" icon represents the LF Project folder. The "code file" icon symbolizes the LF Program, and the "bracket" icon denotes individual reactors within the LF Program.

<img width="271" alt="Screenshot 2024-07-16 alle 12 36 19" src="https://github.com/user-attachments/assets/f159322b-a05a-4010-ad47-5203a275f269">

Within the hierarchy, Tree Items can be classified into three types:

1. **`root`**: Represents the LF Project folder.
2. **`file`**: Represents the LF Program.
3. **`reactor`**: Represents a reactor within the LF Program.

Upon selection, both `file` and `reactor` items offer specific actions. From right to left, for the `file` item, we have the "Open in Split View" and "Go To File" commands. Similarly, for the `reactor` item, we have the "Import Selected Reactor" and "Go To File" options. While the "Open in Split View" and "Go To File" commands are self-explanatory, the "Import Selected Reactor" function inserts an import statement at the beginning of a LF program. However, this action is only available if there's an LF Program open in our active VS Code editor. Otherwise, a popup notification will inform us that there is no LF Program opened. Additionally, `reactor` items offer the ‘Open in Split View’ command, which can be accessed by right-clicking on the item

### Lingo Libraries View

If the developer instead of defining its own library, already found a ready-to-use LF Program on GitHub that exploit the same functionalities needed by the developer, the it can utilize the [Lingo Package Manager](https://github.com/lf-lang/lingo) to retrieve the remote LF Program and install it into a specified path within the developer's workspace.

### Using Lingo Package Manager for GitHub Repo Downloads

To effectively utilize Lingo for downloading a remote LF Project (GitHub repo), proper installation and configuration of Lingo for your LF Project are prerequisites. Detailed guidelines for this setup can be found at the following [link](https://www.lf-lang.org/blog/) and on [Lingo GitHub repo](https://github.com/lf-lang/lingo). Both the local and remote projects must be initialized with Lingo.

Once Lingo has been properly initialized on the local side, programmers will discover a `Lingo.toml` file within its folder. An example of this file is the following:

```toml
[package]
name = "firstproject"
version = "0.1.0"

[properties]

[lib]
name = "firstproject"
main = "./src/first.lf"
target = "C"
platform = "Native"

[lib.properties]

[dependencies]

library_1 = {version=">=0.1",git="https://github.com/path/to/repo.git"}
library_2 = {version="<=2.3",git="https://github.com/path/to/repo.git"}

```

The `Lingo.toml` specifies a set of libs that are executable LF programs, crucial for remote files as it directs where to find the LF program containing the reactors. These apps can be configured with additional build and target properties. Under the `[dependencies]` section, developers can introduce the remote GitHub repos they deem useful for their project. Once all necessary remote repos are listed, simply execute `lingo build`, and Lingo will initiate the download of the listed dependencies. Developers can then find the libraries at the following path `{project_name}/target/lfc_include/` in the local workspace.

### Lingo Libraries View Structure

After being downloaded into the local workspace, the Lingo Libraries view is responsible for listing all the downloaded libraries, accessible at the following path: `{project_name}/target/lfc_include/{library_name}/src/lib/*.lf`. The hierarchy resembles that of the Local Libraries view but introduces an additional level:

```
├── LF Project
│   ├── library_1
│   │   ├── LF Program 1
│   │   |   ├── Reactor 1
│   │   └── └── Reactor 2
│   │   ├── LF Program 2
│   │   |   ├── Reactor 1
│   │   └── └── Reactor 2
│   ├── library_2
│   │   ├── LF Program 1
│   │   |   ├── Reactor 1
└── └── └── └── Reactor 2
```

In this structure, the `LF Project` serves as the root LF Project, while `library_x` refer to the root folder of the libraries the developer has inserted in the `[dependencies]` section of the `.toml` file. Each library functions as a conventional LF Project containing one or more LF Programs intended as libraries, i.e., they encompass lists of reactors that developers could include.

The image below illustrates the Lingo Libraries view: the ‘root folder’ icon represents the LF Project folder and the downloaded libraries, shown here as `AudioClassification` and the `edgeai` library, respectively.. The 'code file' icon symbolizes the LF Program within the downloaded library, while the 'bracket' icon denotes individual reactors within the LF Program.

<img width="307" alt="Screenshot 2024-07-16 alle 12 26 39" src="https://github.com/user-attachments/assets/ba0f8ec6-c9b8-4ac3-9bc2-f500b0c11265">

Within the hierarchy, similar to the Local View, Tree Items can be categorized into three types:

1. **`root`**: Represents the LF Project’s root folder and the root folder of the downloaded library.
2. **`file`**: Represents the LF Program within the downloaded library.
3. **`reactor`**: Denotes a reactor within the LF Program.

Upon selection, both `file` and `reactor` items offer specific actions, consistent with those described in the [Local Libraries view](#local-libraries-view). For `file` items, these actions include the 'Open in Split View' and 'Go To File' commands. For `reactor` items, the options include 'Go To File' and 'Import Selected Reactor'. Additionally, `reactor` items offer the 'Open in Split View' command, which can be accessed by right-clicking on the item.

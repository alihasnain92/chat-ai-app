# Conversation Flow

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Database

    %% Creating a conversation
    rect rgb(240, 248, 255)
        Note over Client,Database: 1. Creating a Conversation
        Client->>Server: POST /conversations
        Server->>Database: Create conversation + participants
        Database-->>Server: Conversation created
        Server-->>Client: Return conversation
    end

    %% Sending a message
    rect rgb(255, 250, 240)
        Note over Client,Database: 2. Sending a Message
        Client->>Server: POST /conversations/:id/messages
        Server->>Database: Create message, update conversation
        Database-->>Server: Message created
        Server-->>Client: Return message
    end

    %% Loading conversation
    rect rgb(240, 255, 240)
        Note over Client,Database: 3. Loading Conversation
        Client->>Server: GET /conversations/:id
        Server->>Database: Fetch conversation
        Database-->>Server: Conversation data
        Server-->>Client: Return conversation
        Client->>Server: GET /conversations/:id/messages
        Server->>Database: Fetch messages
        Database-->>Server: Messages data
        Server-->>Client: Return messages
    end
```

## Flow Description

### 1. Creating a Conversation
- Client initiates conversation creation with POST request
- Server processes the request and creates conversation record with participants
- Database stores the conversation and participant associations
- Server returns the newly created conversation to the client

### 2. Sending a Message
- Client sends a message to an existing conversation
- Server creates the message record and updates conversation metadata (e.g., last message time)
- Database persists the message and updated conversation
- Server returns the created message to the client

### 3. Loading Conversation
- Client requests conversation details and messages in two separate calls
- Server fetches conversation data from database and returns it
- Client then requests all messages for that conversation
- Server fetches messages from database and returns them to the client
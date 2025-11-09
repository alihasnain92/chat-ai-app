sequenceDiagram
    participant CA as Client A (Sender)
    participant Server
    participant DB as Database
    participant CB as Client B (Receiver)

    Note over CA,CB: Success Path: Message Flow with Optimistic UI

    CA->>CA: Generate temp_id (e.g., "temp_123")
    CA->>CA: Show message optimistically<br/>(temp_id, "sending" status)
    
    CA->>Server: emit send-message<br/>{temp_id, conversationId, content}
    
    Server->>Server: Verify user is participant<br/>in conversation
    
    Server->>DB: INSERT message<br/>(userId, conversationId, content)
    DB-->>Server: Return real message ID (e.g., "msg_456")
    
    Server->>CA: emit message:new<br/>{id: "msg_456", temp_id: "temp_123",<br/>content, timestamp, status: "sent"}
    Server->>CB: emit message:new<br/>{id: "msg_456", temp_id: "temp_123",<br/>content, timestamp, status: "sent"}
    
    CA->>CA: Replace temp message<br/>with real message<br/>(temp_123 → msg_456)
    
    CB->>CB: Display new message<br/>(id: msg_456)
    CB->>Server: emit delivered-ack<br/>{messageId: "msg_456"}
    
    Server->>DB: UPDATE message<br/>SET status = "delivered"
    DB-->>Server: Success
    
    Server->>CA: emit message:status<br/>{messageId: "msg_456",<br/>status: "delivered"}
    Server->>CB: emit message:status<br/>{messageId: "msg_456",<br/>status: "delivered"}
    
    CA->>CA: Update message status<br/>display (✓✓)

    Note over CA,CB: Error Path: Message Fails to Send

    CA->>CA: Generate temp_id (e.g., "temp_789")
    CA->>CA: Show message optimistically<br/>(temp_id, "sending" status)
    
    CA->>Server: emit send-message<br/>{temp_id, conversationId, content}
    
    alt User Not Authorized
        Server->>Server: Verify user fails<br/>(not a participant)
        Server->>CA: emit error<br/>{temp_id: "temp_789",<br/>error: "Unauthorized"}
        CA->>CA: Mark message as failed<br/>(show retry button)
    else Database Error
        Server->>Server: Verify user succeeds
        Server->>DB: INSERT message
        DB-->>Server: Database error
        Server->>CA: emit error<br/>{temp_id: "temp_789",<br/>error: "Failed to send"}
        CA->>CA: Mark message as failed<br/>(show retry button)
    else Network Timeout
        CA->>CA: No response received<br/>after timeout (5s)
        CA->>CA: Mark message as failed<br/>(show retry button)
    end
    
    Note over CA: User clicks retry button
    CA->>CA: Reset message status<br/>to "sending"
    CA->>Server: emit send-message<br/>{temp_id: "temp_789",<br/>conversationId, content}
    Note over CA,Server: Retry follows success path...

    Note over CA,CB: Typing Indicator Flow

    CA->>CA: User starts typing<br/>in input field
    
    Note over CA: Debounce logic:<br/>Only emit after 300ms<br/>of continuous typing
    
    CA->>CA: Start debounce timer<br/>(300ms)
    CA->>CA: Timer expires,<br/>emit typing event
    
    CA->>Server: emit typing<br/>{conversationId: "conv_123",<br/>isTyping: true}
    
    Server->>Server: Verify user in conversation
    
    Server->>CB: broadcast typing:update<br/>{userId: "user_A",<br/>userName: "Alice",<br/>isTyping: true}<br/>(excludes sender)
    
    CB->>CB: Show typing indicator<br/>"Alice is typing..."
    
    Note over CA: User continues typing...<br/>No new events sent<br/>(already isTyping: true)
    
    CA->>CA: User stops typing<br/>for 3 seconds
    CA->>CA: Inactivity timer expires<br/>(3000ms)
    
    CA->>Server: emit typing<br/>{conversationId: "conv_123",<br/>isTyping: false}
    
    Server->>CB: broadcast typing:update<br/>{userId: "user_A",<br/>userName: "Alice",<br/>isTyping: false}
    
    CB->>CB: Hide typing indicator
    
    Note over CA,CB: Edge Case: User Sends Message While Typing
    
    CA->>CA: User typing...<br/>indicator active
    CA->>Server: emit send-message<br/>{conversationId, content}
    CA->>Server: emit typing<br/>{conversationId,<br/>isTyping: false}<br/>(auto-stop on send)
    
    Server->>CB: broadcast message:new
    Server->>CB: broadcast typing:update<br/>{isTyping: false}
    
    CB->>CB: Hide typing indicator<br/>Show new message
    
    Note over CA,CB: Debouncing & Throttling Notes
    
    Note over CA: Debounce Strategy:<br/>- Wait 300ms after typing starts<br/>- Only emit once per typing session<br/>- Prevent rapid on/off events<br/><br/>Throttle Strategy:<br/>- Maximum 1 typing event per second<br/>- Prevents server spam<br/><br/>Auto-stop Strategy:<br/>- Stop after 3s of inactivity<br/>- Stop when message sent<br/>- Stop on input blur/unmount

    Note over CA,CB: Message Status Updates Flow

    participant SC as Sender Client
    participant Server
    participant DB as Database
    participant RC as Receiver Client

    Note over SC,RC: Status Progression: sending → sent → delivered → read

    SC->>SC: User sends message<br/>status: "sending"<br/>timestamp: null<br/>(optimistic UI, not in DB)
    
    SC->>Server: emit send-message<br/>{temp_id, conversationId, content}
    
    Server->>Server: Verify authorization
    Server->>DB: INSERT message<br/>{content, userId, conversationId}
    DB-->>Server: Return message ID<br/>+ createdAt timestamp
    
    Note over Server: Status: "sent"<br/>sentAt: 2025-11-09T10:15:30Z
    
    Server->>SC: emit message:new<br/>{id, temp_id, content,<br/>status: "sent",<br/>sentAt: "2025-11-09T10:15:30Z"}
    Server->>RC: emit message:new<br/>{id, content,<br/>status: "sent",<br/>sentAt: "2025-11-09T10:15:30Z"}
    
    SC->>SC: Replace temp message<br/>status: "sent" ✓<br/>sentAt: 10:15:30
    
    RC->>RC: Display new message<br/>status: "sent"
    RC->>Server: emit delivered-ack<br/>{messageId: id}
    
    Server->>DB: UPDATE message<br/>SET status = "delivered",<br/>deliveredAt = NOW()
    DB-->>Server: Success<br/>deliveredAt: 2025-11-09T10:15:31Z
    
    Note over Server: Status: "delivered"<br/>deliveredAt: 2025-11-09T10:15:31Z
    
    Server->>SC: emit message:status<br/>{messageId: id,<br/>status: "delivered",<br/>deliveredAt: "2025-11-09T10:15:31Z"}
    Server->>RC: emit message:status<br/>{messageId: id,<br/>status: "delivered",<br/>deliveredAt: "2025-11-09T10:15:31Z"}
    
    SC->>SC: Update message status<br/>status: "delivered" ✓✓<br/>deliveredAt: 10:15:31
    
    Note over RC: User scrolls...<br/>Message enters viewport
    
    RC->>RC: IntersectionObserver triggers<br/>message is 50%+ visible
    RC->>RC: Debounce 500ms<br/>(batch multiple messages)
    
    RC->>Server: emit read<br/>{messageIds: [id]}
    
    Server->>DB: UPDATE messages<br/>SET status = "read",<br/>readAt = NOW()<br/>WHERE id IN (messageIds)
    DB-->>Server: Success<br/>readAt: 2025-11-09T10:15:35Z
    
    Note over Server: Status: "read"<br/>readAt: 2025-11-09T10:15:35Z
    
    Server->>SC: emit message:status<br/>{messageId: id,<br/>status: "read",<br/>readAt: "2025-11-09T10:15:35Z"}
    Server->>RC: emit message:status<br/>{messageId: id,<br/>status: "read",<br/>readAt: "2025-11-09T10:15:35Z"}
    
    SC->>SC: Update message status<br/>status: "read" ✓✓ (blue)<br/>readAt: 10:15:35
    
    Note over SC,RC: Batch Read Receipts (Multiple Messages)
    
    RC->>RC: User scrolls quickly<br/>5 messages enter viewport
    RC->>RC: Collect message IDs:<br/>[msg_1, msg_2, msg_3, msg_4, msg_5]
    RC->>RC: Debounce timer expires<br/>(500ms after last intersection)
    
    RC->>Server: emit read<br/>{messageIds: [msg_1, msg_2,<br/>msg_3, msg_4, msg_5]}
    
    Server->>DB: Batch UPDATE messages<br/>SET status = "read"<br/>WHERE id IN (5 IDs)
    DB-->>Server: 5 rows updated
    
    Server->>SC: emit message:status<br/>(5 separate updates or batched)
    
    SC->>SC: Update 5 messages to "read"<br/>Show blue checkmarks
    
    Note over SC,RC: Status Transition Rules
    
    Note over SC,RC: Valid Transitions:<br/>null → sending (client only)<br/>sending → sent (server persists)<br/>sent → delivered (recipient receives)<br/>delivered → read (recipient views)<br/><br/>Invalid Transitions:<br/>- Cannot skip statuses<br/>- Cannot go backwards<br/>- "sending" never reaches server<br/><br/>Timestamps:<br/>- sentAt: When server persists<br/>- deliveredAt: When client receives<br/>- readAt: When user views message<br/><br/>UI Indicators:<br/>- sending: clock icon ⏱<br/>- sent: single checkmark ✓<br/>- delivered: double checkmark ✓✓<br/>- read: blue double checkmark ✓✓

    Note over CA,CB: Reaction Flow (with Toggle Logic)

    participant CA as Client A (Reacting)
    participant Server
    participant DB as Database
    participant CB as Client B (Viewing)

    Note over CA,CB: User clicks reaction emoji on message

    CA->>CA: User clicks "❤️" on message<br/>messageId: "msg_123"
    CA->>CA: Optimistic UI update<br/>Add ❤️ to reactions<br/>(show immediately)
    
    CA->>Server: emit react<br/>{messageId: "msg_123",<br/>emoji: "❤️"}
    
    Server->>Server: Verify user in conversation<br/>(authorization check)
    
    Server->>DB: SELECT * FROM message_reactions<br/>WHERE messageId = "msg_123"<br/>AND userId = "user_A"<br/>AND emoji = "❤️"
    
    alt User Already Reacted (Toggle Off)
        DB-->>Server: Reaction exists<br/>{id: "reaction_456", ...}
        
        Note over Server: User already reacted with ❤️<br/>Remove reaction (toggle off)
        
        Server->>DB: DELETE FROM message_reactions<br/>WHERE id = "reaction_456"
        DB-->>Server: Success (1 row deleted)
        
    else User Has Not Reacted (Add Reaction)
        DB-->>Server: No existing reaction
        
        Note over Server: User hasn't reacted with ❤️<br/>Add new reaction
        
        Server->>DB: INSERT INTO message_reactions<br/>{messageId: "msg_123",<br/>userId: "user_A",<br/>emoji: "❤️",<br/>createdAt: NOW()}
        DB-->>Server: Success<br/>{id: "reaction_789", ...}
    end
    
    Note over Server: Fetch all reactions for aggregation
    
    Server->>DB: SELECT emoji, userId, userName<br/>FROM message_reactions<br/>WHERE messageId = "msg_123"<br/>ORDER BY createdAt
    DB-->>Server: All reactions:<br/>[{emoji: "❤️", userId: "user_B", userName: "Bob"},<br/>{emoji: "❤️", userId: "user_C", userName: "Carol"},<br/>{emoji: "👍", userId: "user_D", userName: "Dave"}]
    
    Note over Server: Aggregate reactions by emoji<br/>Group by emoji, count users
    
    Server->>Server: Aggregate reactions:<br/>❤️: {count: 2, users: ["Bob", "Carol"]}<br/>👍: {count: 1, users: ["Dave"]}
    
    Server->>CA: emit reaction:update<br/>{messageId: "msg_123",<br/>reactions: {<br/>  "❤️": {count: 2, users: ["user_B", "user_C"],<br/>          userNames: ["Bob", "Carol"]},<br/>  "👍": {count: 1, users: ["user_D"],<br/>          userNames: ["Dave"]}<br/>}}
    
    Server->>CB: emit reaction:update<br/>{messageId: "msg_123",<br/>reactions: {...}}
    
    CA->>CA: Update UI with server data<br/>Replace optimistic update<br/>❤️ (2) - Bob, Carol<br/>👍 (1) - Dave
    
    CB->>CB: Update reaction display<br/>❤️ (2) - Bob, Carol<br/>👍 (1) - Dave
    
    Note over CA,CB: User Toggles Reaction Off (Already Reacted)
    
    CA->>CA: User clicks "❤️" again<br/>(already has this reaction)
    CA->>CA: Optimistic removal<br/>Remove ❤️ from display
    
    CA->>Server: emit react<br/>{messageId: "msg_123",<br/>emoji: "❤️"}
    
    Server->>DB: SELECT reaction<br/>(finds existing ❤️ by user_A)
    DB-->>Server: Reaction exists
    
    Server->>DB: DELETE reaction
    DB-->>Server: Success
    
    Server->>DB: SELECT all reactions<br/>for msg_123
    DB-->>Server: Updated reactions list
    
    Server->>Server: Aggregate:<br/>❤️: {count: 2, users: ["user_B", "user_C"]}<br/>👍: {count: 1, users: ["user_D"]}<br/>(user_A's ❤️ removed)
    
    Server->>CA: emit reaction:update<br/>{messageId: "msg_123",<br/>reactions: {...}}
    Server->>CB: emit reaction:update<br/>{messageId: "msg_123",<br/>reactions: {...}}
    
    CA->>CA: Confirm removal<br/>❤️ no longer shown for user_A
    CB->>CB: Update display<br/>❤️ count decreased
    
    Note over CA,CB: Reaction Aggregation & Display Logic
    
    Note over CA,CB: Server Aggregation Algorithm:<br/>1. Fetch all reactions for message<br/>2. Group by emoji type<br/>3. Count unique users per emoji<br/>4. Include user IDs and names<br/>5. Sort by count (most popular first)<br/><br/>Client Display Logic:<br/>- Show emoji with count: "❤️ 5"<br/>- Highlight if current user reacted<br/>- On hover: show list of names<br/>  "Bob, Alice, Carol, +2 others"<br/>- Limit visible names (e.g., first 3)<br/>- Click to toggle own reaction<br/><br/>Data Structure Example:<br/>{<br/>  "❤️": {<br/>    count: 5,<br/>    users: ["user_1", "user_2", ...],<br/>    userNames: ["Alice", "Bob", ...],<br/>    hasCurrentUser: true<br/>  },<br/>  "👍": {<br/>    count: 3,<br/>    users: ["user_3", "user_4", "user_5"],<br/>    userNames: ["Carol", "Dave", "Eve"],<br/>    hasCurrentUser: false<br/>  }<br/>}<br/><br/>Optimistic UI Benefits:<br/>- Instant feedback (no lag)<br/>- Server authoritative (final source)<br/>- Auto-corrects on error<br/>- Handles race conditions
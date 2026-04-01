import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile type
  public type UserProfile = {
    name : Text;
    // Other user metadata if needed
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // Data types with owner field
  type Category = {
    id : Nat;
    owner : Principal;
    name : Text;
    createdAt : Int;
  };

  type SubTopic = {
    id : Nat;
    owner : Principal;
    categoryId : Nat;
    name : Text;
    createdAt : Int;
  };

  type Session = {
    id : Nat;
    owner : Principal;
    subTopicId : Nat;
    categoryId : Nat;
    startTime : Int;
    durationSeconds : Nat;
    note : Text;
    energyRating : Text;
  };

  type TodoItem = {
    id : Nat;
    owner : Principal;
    subTopicId : Nat;
    text : Text;
    completed : Bool;
    createdAt : Int;
  };

  type ImprovementNote = {
    id : Nat;
    owner : Principal;
    dateKey : Text;
    note : Text;
    updatedAt : Int;
  };

  // Persistent storage using mutable Map objects
  let categories = Map.empty<Nat, Category>();
  let subTopics = Map.empty<Nat, SubTopic>();
  let sessions = Map.empty<Nat, Session>();
  let todoItems = Map.empty<Nat, TodoItem>();
  let improvementNotes = Map.empty<Nat, ImprovementNote>();

  // Incremental ID generator
  var nextId = 1;

  func getNextId() : Nat {
    let currentId = nextId;
    nextId += 1;
    currentId;
  };

  // Comparison Modules
  module Category {
    public func compare(cat1 : Category, cat2 : Category) : Order.Order {
      Nat.compare(cat1.id, cat2.id);
    };
  };

  module SubTopic {
    public func compare(sub1 : SubTopic, sub2 : SubTopic) : Order.Order {
      Nat.compare(sub1.id, sub2.id);
    };
  };

  module Session {
    public func compare(session1 : Session, session2 : Session) : Order.Order {
      Int.compare(session1.startTime, session2.startTime);
    };
  };

  module TodoItem {
    public func compare(todo1 : TodoItem, todo2 : TodoItem) : Order.Order {
      Nat.compare(todo1.id, todo2.id);
    };
  };

  module ImprovementNote {
    public func compare(note1 : ImprovementNote, note2 : ImprovementNote) : Order.Order {
      Text.compare(note1.dateKey, note2.dateKey);
    };
  };

  // Utility functions for finding entities with ownership verification
  func findCategory(id : Nat, caller : Principal) : Category {
    switch (categories.get(id)) {
      case (?category) {
        if (category.owner != caller) {
          Runtime.trap("Unauthorized: You don't own this category");
        };
        category;
      };
      case (null) { Runtime.trap("Category not found") };
    };
  };

  func findSubTopic(id : Nat, caller : Principal) : SubTopic {
    switch (subTopics.get(id)) {
      case (?subTopic) {
        if (subTopic.owner != caller) {
          Runtime.trap("Unauthorized: You don't own this sub-topic");
        };
        subTopic;
      };
      case (null) { Runtime.trap("SubTopic not found") };
    };
  };

  func findSession(id : Nat, caller : Principal) : Session {
    switch (sessions.get(id)) {
      case (?session) {
        if (session.owner != caller) {
          Runtime.trap("Unauthorized: You don't own this session");
        };
        session;
      };
      case (null) { Runtime.trap("Session not found") };
    };
  };

  func findTodoItem(id : Nat, caller : Principal) : TodoItem {
    switch (todoItems.get(id)) {
      case (?item) {
        if (item.owner != caller) {
          Runtime.trap("Unauthorized: You don't own this todo item");
        };
        item;
      };
      case (null) { Runtime.trap("TodoItem not found") };
    };
  };

  // Add Category
  public shared ({ caller }) func addCategory(name : Text) : async Category {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let newId = getNextId();
    let category = {
      id = newId;
      owner = caller;
      name;
      createdAt = Time.now();
    };
    categories.add(newId, category);
    category;
  };

  // Add SubTopic
  public shared ({ caller }) func addSubTopic(categoryId : Nat, name : Text) : async SubTopic {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    ignore findCategory(categoryId, caller);
    let newId = getNextId();
    let subTopic = {
      id = newId;
      owner = caller;
      categoryId;
      name;
      createdAt = Time.now();
    };
    subTopics.add(newId, subTopic);
    subTopic;
  };

  // Add Session
  public shared ({ caller }) func addSession(
    subTopicId : Nat,
    categoryId : Nat,
    startTime : Int,
    durationSeconds : Nat,
    note : Text,
    energyRating : Text,
  ) : async Session {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    ignore findSubTopic(subTopicId, caller);
    ignore findCategory(categoryId, caller);
    let newId = getNextId();
    let session = {
      id = newId;
      owner = caller;
      subTopicId;
      categoryId;
      startTime;
      durationSeconds;
      note;
      energyRating;
    };
    sessions.add(newId, session);
    session;
  };

  // Add Todo Item
  public shared ({ caller }) func addTodoItem(subTopicId : Nat, text : Text) : async TodoItem {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    ignore findSubTopic(subTopicId, caller);
    let newId = getNextId();
    let item = {
      id = newId;
      owner = caller;
      subTopicId;
      text;
      completed = false;
      createdAt = Time.now();
    };
    todoItems.add(newId, item);
    item;
  };

  // Toggle Todo Item Completed
  public shared ({ caller }) func toggleTodoItemCompleted(id : Nat) : async TodoItem {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let item = findTodoItem(id, caller);
    let updatedItem = {
      item with completed = not item.completed
    };
    todoItems.add(id, updatedItem);
    updatedItem;
  };

  // Upsert Improvement Note
  public shared ({ caller }) func upsertImprovementNote(dateKey : Text, note : Text) : async ImprovementNote {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    // Check if note already exists for this user and dateKey
    for (entry in improvementNotes.values()) {
      if (entry.owner == caller and entry.dateKey == dateKey) {
        let updated = {
          id = entry.id;
          owner = caller;
          dateKey;
          note;
          updatedAt = Time.now();
        };
        improvementNotes.add(entry.id, updated);
        return updated;
      };
    };
    let newId = getNextId();
    let newNote = {
      id = newId;
      owner = caller;
      dateKey;
      note;
      updatedAt = Time.now();
    };
    improvementNotes.add(newId, newNote);
    newNote;
  };

  // Get All Categories
  public query ({ caller }) func getAllCategories() : async [Category] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let callerCategories = List.empty<Category>();
    for (category in categories.values()) {
      if (category.owner == caller) {
        callerCategories.add(category);
      };
    };
    callerCategories.toArray().sort();
  };

  // Get All SubTopics
  public query ({ caller }) func getAllSubTopics() : async [SubTopic] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let callerSubTopics = List.empty<SubTopic>();
    for (subTopic in subTopics.values()) {
      if (subTopic.owner == caller) {
        callerSubTopics.add(subTopic);
      };
    };
    callerSubTopics.toArray().sort();
  };

  // Get SubTopics by Category
  public query ({ caller }) func getSubTopicsByCategory(categoryId : Nat) : async [SubTopic] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let categorySubTopics = List.empty<SubTopic>();
    for (subTopic in subTopics.values()) {
      if (subTopic.owner == caller and subTopic.categoryId == categoryId) {
        categorySubTopics.add(subTopic);
      };
    };
    categorySubTopics.toArray().sort();
  };

  // Get All Sessions
  public query ({ caller }) func getAllSessions() : async [Session] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let callerSessions = List.empty<Session>();
    for (session in sessions.values()) {
      if (session.owner == caller) {
        callerSessions.add(session);
      };
    };
    callerSessions.toArray().sort();
  };

  // Get Sessions by Time Range
  public query ({ caller }) func getSessionsByTimeRange(startTime : Int, endTime : Int) : async [Session] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let rangeSessions = List.empty<Session>();
    for (session in sessions.values()) {
      if (
        session.owner == caller and session.startTime >= startTime and session.startTime <= endTime
      ) {
        rangeSessions.add(session);
      };
    };
    rangeSessions.toArray().sort();
  };

  // Get Todo Items by SubTopic
  public query ({ caller }) func getTodoItemsBySubTopic(subTopicId : Nat) : async [TodoItem] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let subTopicTodos = List.empty<TodoItem>();
    for (todoItem in todoItems.values()) {
      if (todoItem.owner == caller and todoItem.subTopicId == subTopicId) {
        subTopicTodos.add(todoItem);
      };
    };
    subTopicTodos.toArray().sort();
  };

  // Get All Improvement Notes
  public query ({ caller }) func getAllImprovementNotes() : async [ImprovementNote] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    let callerNotes = List.empty<ImprovementNote>();
    for (note in improvementNotes.values()) {
      if (note.owner == caller) {
        callerNotes.add(note);
      };
    };
    callerNotes.toArray().sort();
  };

  // Get Improvement Note by DateKey
  public query ({ caller }) func getImprovementNoteByDateKey(dateKey : Text) : async ?ImprovementNote {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    for (note in improvementNotes.values()) {
      if (note.owner == caller and note.dateKey == dateKey) {
        return ?note;
      };
    };
    null;
  };

  // Delete Category
  public shared ({ caller }) func deleteCategory(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    ignore findCategory(id, caller);
    categories.remove(id);
  };

  // Delete SubTopic
  public shared ({ caller }) func deleteSubTopic(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    ignore findSubTopic(id, caller);
    subTopics.remove(id);
  };

  // Delete Todo Item
  public shared ({ caller }) func deleteTodoItem(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    ignore findTodoItem(id, caller);
    todoItems.remove(id);
  };

  // Query: Get total seconds per category
  public query ({ caller }) func getTotalSecondsByCategory() : async [(Nat, Nat)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    // Collect sessions for this caller into a new array
    let callerSessions = List.empty<Session>();
    for (session in sessions.values()) {
      if (session.owner == caller) {
        callerSessions.add(session);
      };
    };
    // Calculate category totals
    let categoryTotals = Map.empty<Nat, Nat>();
    for (session in callerSessions.toArray().values()) {
      let currentTotal = switch (categoryTotals.get(session.categoryId)) {
        case (?total) { total };
        case (null) { 0 };
      };
      categoryTotals.add(session.categoryId, currentTotal + session.durationSeconds);
    };
    // Convert categoryTotals map to array of entries
    categoryTotals.entries().toArray();
  };

  // Query: Get total seconds per sub-topic
  public query ({ caller }) func getTotalSecondsBySubTopic() : async [(Nat, Nat)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload events");
    };
    // Collect sessions for this caller into a new array
    let callerSessions = List.empty<Session>();
    for (session in sessions.values()) {
      if (session.owner == caller) {
        callerSessions.add(session);
      };
    };
    // Calculate sub-topic totals
    let subTopicTotals = Map.empty<Nat, Nat>();
    for (session in callerSessions.toArray().values()) {
      let currentTotal = switch (subTopicTotals.get(session.subTopicId)) {
        case (?total) { total };
        case (null) { 0 };
      };
      subTopicTotals.add(session.subTopicId, currentTotal + session.durationSeconds);
    };
    // Convert subTopicTotals map to array of entries
    subTopicTotals.entries().toArray();
  };
};

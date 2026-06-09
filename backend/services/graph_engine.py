import networkx as nx
import json
from typing import Dict, List, Any

# In-memory graph store per story
_graphs: Dict[str, nx.DiGraph] = {}


def get_graph(story_id: str) -> nx.DiGraph:
    if story_id not in _graphs:
        _graphs[story_id] = nx.DiGraph()
    return _graphs[story_id]


def add_character_node(story_id: str, character_data: dict):
    G = get_graph(story_id)
    node_id = f"char_{character_data['name'].lower().replace(' ', '_')}"
    G.add_node(node_id,
               label=character_data["name"],
               node_type="character",
               age=character_data.get("age", "Unknown"),
               gender=character_data.get("gender", "Unknown"),
               status=character_data.get("status", "alive"),
               goals=character_data.get("goals", []),
               personality=character_data.get("personality", []))
    return node_id


def add_location_node(story_id: str, location_data: dict):
    G = get_graph(story_id)
    node_id = f"loc_{location_data['name'].lower().replace(' ', '_')}"
    G.add_node(node_id,
               label=location_data["name"],
               node_type="location",
               description=location_data.get("description", ""),
               significance=location_data.get("significance", ""))
    return node_id


def add_event_node(story_id: str, event_data: dict, chapter: str):
    G = get_graph(story_id)
    safe_name = event_data["name"].lower().replace(" ", "_")[:30]
    node_id = f"evt_{safe_name}_{chapter}"
    G.add_node(node_id,
               label=event_data["name"],
               node_type="event",
               description=event_data.get("description", ""),
               chapter=chapter,
               event_type=event_data.get("event_type", "general"))
    return node_id


def add_relationship_edge(story_id: str, entity_a: str, entity_b: str, rel_type: str, description: str = ""):
    G = get_graph(story_id)
    node_a = f"char_{entity_a.lower().replace(' ', '_')}"
    node_b = f"char_{entity_b.lower().replace(' ', '_')}"
    
    # Only add edge if both nodes exist
    if G.has_node(node_a) and G.has_node(node_b):
        G.add_edge(node_a, node_b, label=rel_type, description=description)


def get_graph_data(story_id: str) -> dict:
    G = get_graph(story_id)
    
    nodes = []
    for node_id, data in G.nodes(data=True):
        nodes.append({
            "id": node_id,
            "label": data.get("label", node_id),
            "node_type": data.get("node_type", "unknown"),
            "data": {k: v for k, v in data.items() if k not in ["label", "node_type"]}
        })
    
    edges = []
    for src, tgt, data in G.edges(data=True):
        edges.append({
            "source": src,
            "target": tgt,
            "label": data.get("label", "related"),
        })
    
    return {"nodes": nodes, "edges": edges}


def get_character_connections(story_id: str, character_name: str) -> dict:
    G = get_graph(story_id)
    node_id = f"char_{character_name.lower().replace(' ', '_')}"
    
    if not G.has_node(node_id):
        return {"nodes": [], "edges": []}
    
    # Get ego graph (node + its neighbors)
    ego = nx.ego_graph(G, node_id, radius=1, undirected=True)
    
    nodes = []
    for n, data in ego.nodes(data=True):
        nodes.append({
            "id": n,
            "label": data.get("label", n),
            "node_type": data.get("node_type", "unknown"),
            "data": {k: v for k, v in data.items() if k not in ["label", "node_type"]}
        })
    
    edges = []
    for src, tgt, data in ego.edges(data=True):
        edges.append({
            "source": src,
            "target": tgt,
            "label": data.get("label", "related")
        })
    
    return {"nodes": nodes, "edges": edges}


def rebuild_graph_from_db(story_id: str, characters: list, locations: list, events: list, relationships: list):
    """Rebuild the in-memory graph from database records."""
    _graphs[story_id] = nx.DiGraph()
    
    for char in characters:
        add_character_node(story_id, {
            "name": char.name,
            "age": char.age,
            "gender": char.gender,
            "status": char.status,
            "goals": json.loads(char.goals) if char.goals else [],
            "personality": json.loads(char.personality) if char.personality else []
        })
    
    for loc in locations:
        add_location_node(story_id, {
            "name": loc.name,
            "description": loc.description,
            "significance": loc.significance
        })
    
    for evt in events:
        add_event_node(story_id, {
            "name": evt.name,
            "description": evt.description,
            "event_type": evt.event_type
        }, evt.chapter)
    
    for rel in relationships:
        add_relationship_edge(story_id, rel.entity_a, rel.entity_b, rel.relationship_type, rel.description)

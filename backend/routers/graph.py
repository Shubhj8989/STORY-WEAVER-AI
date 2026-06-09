from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db, Character, Location, Event, Relationship
from services.graph_engine import get_graph_data, rebuild_graph_from_db
import json

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/{story_id}")
async def get_full_graph(story_id: str, db: AsyncSession = Depends(get_db)):
    """Get the full knowledge graph for a story."""
    # Rebuild graph from DB in case server restarted
    chars = (await db.execute(select(Character).where(Character.story_id == story_id))).scalars().all()
    locs = (await db.execute(select(Location).where(Location.story_id == story_id))).scalars().all()
    evts = (await db.execute(select(Event).where(Event.story_id == story_id))).scalars().all()
    rels = (await db.execute(select(Relationship).where(Relationship.story_id == story_id))).scalars().all()
    
    rebuild_graph_from_db(story_id, chars, locs, evts, rels)
    
    return get_graph_data(story_id)


@router.get("/{story_id}/stats")
async def get_graph_stats(story_id: str, db: AsyncSession = Depends(get_db)):
    """Get graph statistics."""
    graph_data = await get_full_graph(story_id, db)
    
    node_types = {}
    for node in graph_data["nodes"]:
        t = node["node_type"]
        node_types[t] = node_types.get(t, 0) + 1
    
    return {
        "total_nodes": len(graph_data["nodes"]),
        "total_edges": len(graph_data["edges"]),
        "node_types": node_types,
        "most_connected": _find_most_connected(graph_data)
    }


def _find_most_connected(graph_data: dict) -> list:
    degree = {}
    for edge in graph_data["edges"]:
        degree[edge["source"]] = degree.get(edge["source"], 0) + 1
        degree[edge["target"]] = degree.get(edge["target"], 0) + 1
    
    # Find nodes in node list
    node_map = {n["id"]: n["label"] for n in graph_data["nodes"]}
    
    sorted_nodes = sorted(degree.items(), key=lambda x: x[1], reverse=True)[:5]
    return [{"name": node_map.get(n[0], n[0]), "connections": n[1]} for n in sorted_nodes]

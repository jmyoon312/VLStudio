from sqlalchemy.orm import Session
from ..models import NodeMemory
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class MemoryManager:
    def __init__(self):
        pass

    def get_context(self, db: Session, node_id: str, limit: int = 10) -> list:
        """
        Retrieve memory context for a node.
        Returns a list of message dicts: [{"role": "...", "content": "..."}]
        """
        try:
            memory_record = db.query(NodeMemory).filter(NodeMemory.node_id == node_id).first()
            if memory_record and memory_record.memory_context:
                # Return last 'limit' items (though we prune on save, being safe here)
                # Context usually pairs (User+AI), so limit might mean limit messages
                # Let's assume limit is raw message count
                return memory_record.memory_context
            return []
        except Exception as e:
            logger.error(f"Memory GET failed: {e}")
            return []

    def add_turn(self, db: Session, node_id: str, user_input: str, ai_output: str, max_pairs: int = 10):
        """
        Add a conversation turn (User + AI) and prune old history.
        """
        try:
            memory_record = db.query(NodeMemory).filter(NodeMemory.node_id == node_id).first()
            
            if not memory_record:
                memory_record = NodeMemory(node_id=node_id, memory_context=[])
                db.add(memory_record)
            
            # Ensure context is a list
            current_context = list(memory_record.memory_context) if memory_record.memory_context else []
            
            # Append new turn
            if user_input:
                current_context.append({"role": "user", "content": user_input})
            if ai_output:
                current_context.append({"role": "assistant", "content": ai_output})
            
            # Pruning Logic: Keep last X messages (max_pairs * 2)
            max_messages = max_pairs * 2
            if len(current_context) > max_messages:
                current_context = current_context[-max_messages:]
            
            # Save properly (assigning new list triggers JSON detection usually, but explicit valid)
            memory_record.memory_context = current_context
            memory_record.updated_at = datetime.now()
            
            db.commit()
            db.refresh(memory_record)
            
        except Exception as e:
            logger.error(f"Memory ADD failed: {e}")
            db.rollback()

    def clear_node(self, db: Session, node_id: str):
        """Clear memory for a specific node."""
        try:
            db.query(NodeMemory).filter(NodeMemory.node_id == node_id).delete()
            db.commit()
        except Exception as e:
            logger.error(f"Memory CLEAR failed: {e}")
            db.rollback()

memory_manager = MemoryManager()

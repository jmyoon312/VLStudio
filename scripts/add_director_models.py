import os

models_code = """

# ── 🎬 대화형 디렉터 프로젝트 & 다중 대화 스레드 세션 영구 보관 모델 (viral_loop.db 단일 진실 공급원) ──
class DirectorProject(Base):
    __tablename__ = "director_projects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    color = Column(String, default="emerald")
    icon = Column(String, default="folder")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    threads = relationship("DirectorThread", back_populates="project", cascade="all, delete-orphan")


class DirectorThread(Base):
    __tablename__ = "director_threads"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("director_projects.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String, default="새 대화")
    preset_id = Column(String, nullable=True)
    provider = Column(String, default="openai")
    model = Column(String, default="GPT-6 Astra")
    reasoning_effort = Column(String, default="medium")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    project = relationship("DirectorProject", back_populates="threads")
    messages = relationship("DirectorMessage", back_populates="thread", cascade="all, delete-orphan")


class DirectorMessage(Base):
    __tablename__ = "director_messages"

    id = Column(String, primary_key=True, index=True)
    thread_id = Column(String, ForeignKey("director_threads.id", ondelete="CASCADE"), index=True)
    role = Column(String)  # user | assistant | system
    content = Column(Text, default="")
    steps = Column(JSON, nullable=True)
    deliverable = Column(JSON, nullable=True)
    created_preset = Column(JSON, nullable=True)
    attachments = Column(JSON, default=list)
    tasks = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.now)

    thread = relationship("DirectorThread", back_populates="messages")
"""

target = os.path.join("apps", "api", "app", "models.py")
with open(target, "a", encoding="utf-8") as f:
    f.write(models_code)
print("Successfully appended Director models to models.py")

import sys
import os
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../apps/api')))

from app.database import SessionLocal
from app.models import CategoryTree, DiscoveryChannel, DiscoveryVideo

def run_migration():
    db = SessionLocal()
    try:
        print("[0] Clearing existing discovery channels and videos...")
        db.query(DiscoveryVideo).delete()
        db.query(DiscoveryChannel).delete()
        db.commit()
        print("  -> Deleted all previously discovered channels and their related videos/stats.")
        
        print("[1] Seeding Level 0 (YouTube Macro Categories)...")
        # YouTube Official Categories (Level 0)
        youtube_categories = [
            ("영화/애니메이션", "Film & Animation"),
            ("자동차/교통", "Autos & Vehicles"),
            ("음악", "Music"),
            ("애완동물/동물", "Pets & Animals"),
            ("스포츠", "Sports"),
            ("여행/이벤트", "Travel & Events"),
            ("게임", "Gaming"),
            ("인물/블로그", "People & Blogs"),
            ("코미디", "Comedy"),
            ("엔터테인먼트", "Entertainment"),
            ("뉴스/정치", "News & Politics"),
            ("노하우/스타일", "Howto & Style"),
            ("교육", "Education"),
            ("과학기술", "Science & Technology"),
            ("비영리/사회운동", "Nonprofits & Activism")
        ]
        
        macro_map = {}
        for ko_name, en_name in youtube_categories:
            cat = db.query(CategoryTree).filter(CategoryTree.name == ko_name).first()
            if not cat:
                cat = CategoryTree(
                    name=ko_name,
                    name_en=en_name,
                    level=0,
                    is_fixed=True
                )
                db.add(cat)
                db.flush() # get ID
            else:
                cat.level = 0
                cat.is_fixed = True
                cat.parent_id = None
            macro_map[ko_name] = cat
            
        print("[2] Setting up Migration Map for micro-niche categories...")
        # (Old Name, Macro Name, Middle Name, New Niche Name)
        migration_map = [
            ("국뽕", "뉴스/정치", "글로벌/해외반응", "해외반응/국뽕 쇼츠"),
            ("국내영화쇼츠", "영화/애니메이션", "영화/드라마 리뷰", "국내영화 1분 명장면/요약"),
            ("IT 리뷰", "과학기술", "전자기기/테크", "IT 기기/가젯 꿀팁 리뷰"),
            ("코미디", "코미디", "유머/밈", "해외 틱톡/유머 밈 번역 쇼츠"),
            ("이슈/뉴스", "뉴스/정치", "사회/이슈", "사이버렉카 / 연예 핫이슈"),
            ("요리", "노하우/스타일", "요리/레시피", "1분 컷 초간단 자취생 레시피"),
            ("음악", "음악", "플레이리스트", "K-pop 신곡 교차편집/리액션"),
            ("게임", "게임", "종합/하이라이트", "로블록스 점프맵/마크 쇼츠"),
            ("엔터테인먼트", "엔터테인먼트", "방송 클립", "국내 예능 레전드 폭소 클립"),
            ("여행", "여행/이벤트", "여행 브이로그", "가성비 해외여행/꿀팁 쇼츠"),
            ("일상", "인물/블로그", "브이로그", "감성 힐링/동기부여 명언 쇼츠"),
            ("교육", "교육", "지식/교양", "1분 미스터리/역사 상식"),
            ("홈트", "스포츠", "피트니스", "집에서 하는 맨몸 다이어트 1분 홈트"),
            
            # Additional fine-grained niche categories for Shorts (If old_name doesn't exist, it creates a new one anyway in this script)
            ("아이돌퀴즈", "엔터테인먼트", "방송 클립", "아이돌 안무 1초 듣고 맞추기"),
            ("스포츠리액션", "스포츠", "피트니스", "KBO 직관 텐션/리액션"),
            ("축구오심", "스포츠", "피트니스", "해외 축구 황당 오심 모음"),
            ("강아지브이로그", "애완동물/동물", "반려동물", "골든리트리버 엉뚱 발랄 브이로그"),
            ("강아지미용", "애완동물/동물", "반려동물", "강아지 털 미용 비포/애프터 쇼츠")
        ]
        
        for old_name, macro_name, mid_name, niche_name in migration_map:
            # 1. Create or get Level 1 (Middle)
            mid_cat = db.query(CategoryTree).filter(CategoryTree.name == mid_name).first()
            if not mid_cat:
                mid_cat = CategoryTree(
                    name=mid_name,
                    level=1,
                    parent_id=macro_map[macro_name].id,
                    is_fixed=False,
                    ai_generated=True # 1단계는 시스템 자동 그룹핑
                )
                db.add(mid_cat)
                db.flush()
            
            # 2. Migrate the old category to Level 2 (Niche)
            old_cat = db.query(CategoryTree).filter(CategoryTree.name == old_name).first()
            if old_cat:
                old_cat.name = niche_name
                old_cat.level = 2
                old_cat.parent_id = mid_cat.id
                old_cat.is_fixed = False
                print(f"  -> Migrated [{old_name}] to [{niche_name}] under [{mid_name}]")
            else:
                # If for some reason it doesn't exist, create it
                niche_cat = db.query(CategoryTree).filter(CategoryTree.name == niche_name).first()
                if not niche_cat:
                    niche_cat = CategoryTree(
                        name=niche_name,
                        level=2,
                        parent_id=mid_cat.id,
                        is_fixed=False
                    )
                    db.add(niche_cat)
                    print(f"  -> Created [{niche_name}] under [{mid_name}]")
                    
        # Process '쇼츠' -> Should we delete it? Yes, if it has no channels.
        shorts_cat = db.query(CategoryTree).filter(CategoryTree.name == "쇼츠").first()
        if shorts_cat:
            channel_count = db.query(DiscoveryChannel).filter(DiscoveryChannel.category_id == shorts_cat.id).count()
            if channel_count == 0:
                print("  -> Deleting generic '쇼츠' category (0 channels)")
                db.delete(shorts_cat)
            else:
                print(f"  -> WARNING: '쇼츠' has {channel_count} channels. Cannot safely delete. Moving to Entertainment.")
                # Move to Entertainment > 숏폼
                ent = macro_map["엔터테인먼트"]
                mid_shorts = db.query(CategoryTree).filter(CategoryTree.name == "숏폼/기타").first()
                if not mid_shorts:
                    mid_shorts = CategoryTree(name="숏폼/기타", level=1, parent_id=ent.id, ai_generated=True)
                    db.add(mid_shorts)
                    db.flush()
                shorts_cat.name = "미분류 쇼츠"
                shorts_cat.level = 2
                shorts_cat.parent_id = mid_shorts.id

        db.commit()
        print("[OK] Migration successfully completed!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

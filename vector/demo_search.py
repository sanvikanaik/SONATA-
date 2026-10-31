"""Quick demo of all four search modes:  python demo_search.py"""
from search import find_gigs, find_musicians, gigs_for_musician, musicians_for_gig


def show_musicians(title, rows):
    print(f"\n=== {title}")
    for r in rows:
        print(f"  {r['similarity']:.3f}  {r['name']:<14} {r['experience_level']:<13} "
              f"rating {r['avg_rating']}  [{r['instruments']}]")


def show_gigs(title, rows):
    print(f"\n=== {title}")
    for r in rows:
        print(f"  {r['similarity']:.3f}  #{r['gig_id']:<3} {r['title']:<34} "
              f"Rs {r['budget']:>9}  {r['status']}")


show_musicians("Musicians for: 'smooth relaxed music for a fancy dinner'",
               find_musicians("smooth relaxed music for a fancy dinner", n=3))
show_musicians("Musicians for: 'traditional Indian classical performer' (professionals only)",
               find_musicians("traditional Indian classical performer", n=3, level="professional"))
show_gigs("Open gigs for: 'acoustic singer for a small chilled evening' under Rs 20000",
          find_gigs("acoustic singer for a small chilled evening", n=3, max_budget=20000))
show_musicians("Best musicians for gig #12 (Wedding Reception Band)", musicians_for_gig(12, n=3))
show_gigs("Best open gigs for musician #13 (Isha Kapoor, saxophone)", gigs_for_musician(13, n=3))

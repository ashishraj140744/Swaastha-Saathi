"""
test_triage_engine.py — automated checks for the rule-based classifier.

Run with: python3 test_triage_engine.py
No pytest dependency on purpose, to keep requirements.txt minimal.
"""

import triage_engine

passed = 0
failed = 0


def check(description, condition):
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS  {description}")
    else:
        failed += 1
        print(f"  FAIL  {description}")


def run():
    print("Emergency detection")
    check("breathing difficulty (EN) -> emergency",
          triage_engine.classify("I am having trouble breathing").get("emergency") is True)
    check("saans (HI) -> emergency",
          triage_engine.classify("mujhe saans lene mein dikkat ho rahi hai").get("emergency") is True)
    check("chest pain -> emergency",
          triage_engine.classify("severe chest pain since morning").get("emergency") is True)
    check("unconscious -> emergency",
          triage_engine.classify("my father is unconscious").get("emergency") is True)
    check("bleeding -> emergency",
          triage_engine.classify("there is a lot of bleeding from the wound").get("emergency") is True)

    print("\nCategory matching (English)")
    r = triage_engine.classify("I have had fever for 3 days")
    check("fever -> Fever category, medium urgency",
          r.get("category", {}).get("name") == "Fever" and r.get("urgency") == "medium")

    r = triage_engine.classify("I have a bad cough and cold")
    check("cough/cold -> Respiratory category, low urgency",
          r.get("category", {}).get("name") == "Respiratory" and r.get("urgency") == "low")

    r = triage_engine.classify("I have stomach pain and loose motions")
    check("stomach/loose motions -> Digestive category, medium urgency",
          r.get("category", {}).get("name") == "Digestive" and r.get("urgency") == "medium")

    r = triage_engine.classify("I have a skin rash and itching")
    check("rash/itching -> Skin category, Dermatologist",
          r.get("category", {}).get("name") == "Skin"
          and r.get("category", {}).get("specialist") == "Dermatologist")

    r = triage_engine.classify("I have a headache and body ache")
    check("headache/body ache -> Headache category",
          r.get("category", {}).get("name") == "Headache / Body ache")

    print("\nCategory matching (Hindi / Romanized Hindi)")
    r = triage_engine.classify("mujhe 3 din se bukhar hai", language="hi")
    check("bukhar -> Fever category",
          r.get("category", {}).get("name") == "Fever")

    r = triage_engine.classify("mujhe khansi aur zukam hai", language="hi")
    check("khansi/zukam -> Respiratory category",
          r.get("category", {}).get("name") == "Respiratory")

    r = triage_engine.classify("pet mein dard hai aur dast lag rahe hain", language="hi")
    check("pet dard/dast -> Digestive category",
          r.get("category", {}).get("name") == "Digestive")

    print("\nSpecial routing")
    r = triage_engine.classify("I am pregnant and due for a checkup")
    check("pregnancy -> Maternal category, Gynaecologist",
          r.get("category", {}).get("name") == "Maternal / Pregnancy care"
          and r.get("category", {}).get("specialist") == "Gynaecologist")

    r = triage_engine.classify("my newborn baby has not been feeding well")
    check("newborn/baby -> Child category, Paediatrician",
          r.get("category", {}).get("name") == "Child / Infant health"
          and r.get("category", {}).get("specialist") == "Paediatrician")

    print("\nNo-match fallback")
    r = triage_engine.classify("xyz random text with no symptom keywords")
    check("gibberish -> no category, has message",
          r.get("category") is None and bool(r.get("message")))

    print("\nStructural guarantees")
    r = triage_engine.classify("fever since yesterday")
    check("matched result includes disclaimer",
          bool(r.get("disclaimer")))
    check("matched result includes at least one nearby facility",
          len(r.get("facilities", [])) > 0)
    check("category never contains diagnostic claim wording",
          "you have" not in str(r.get("category", {})).lower())

    print(f"\n{passed} passed, {failed} failed")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    run()


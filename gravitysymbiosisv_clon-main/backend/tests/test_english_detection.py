from langdetect import detect


class TestEnglishDetection:
    def test_spanish_detected(self):
        assert detect("Hola, ¿cómo estás?") == "es"

    def test_english_detected(self):
        assert detect("Hello, how are you?") == "en"

    def test_mixed_not_false_positive(self):
        lang = detect("tú y yo vamos a trabajar juntos")
        assert lang == "es"

    def test_short_spanish_phrase(self):
        lang = detect("gracias por tu tiempo")
        assert lang == "es"

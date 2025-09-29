from src.core.tools import faq_retriever_tool

def test_faq_retriever_tool(mocker):
    # Mock retriever to return fake docs

    mock_retriever = mocker.Mock()
    mock_retriever.get_relevant_documents.return_value = [mocker.Mock(page_content="Fake FAQ")]

    mocker.patch("src.data.embeddings.get_retriever", return_value = mock_retriever)

    result = faq_retriever_tool("test Query")

    assert "Fake FAQ" in result
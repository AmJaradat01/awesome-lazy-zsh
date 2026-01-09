class AwesomeLazyZsh < Formula
  desc "Comprehensive Zsh environment manager with plugins, themes, and profiles"
  homepage "https://github.com/AmJaradat01/awesome-lazy-zsh"
  url "https://github.com/AmJaradat01/awesome-lazy-zsh/archive/refs/tags/v3.1.1.tar.gz"
  sha256 "PLACEHOLDER_SHA256"
  license "MIT"
  version "3.1.1"

  depends_on "git"
  depends_on "node"

  def install
    # Install supporting files
    libexec.install Dir["*"]

    # Create wrapper script that runs from the installed location
    (bin/"awesome-lazy-zsh").write <<~EOS
      #!/bin/bash
      cd "#{libexec}" && exec ./setup.sh "$@"
    EOS
  end

  test do
    # Test that the script exists and is executable
    assert_path_exists bin/"awesome-lazy-zsh"
    assert_predicate bin/"awesome-lazy-zsh", :executable?
  end
end
